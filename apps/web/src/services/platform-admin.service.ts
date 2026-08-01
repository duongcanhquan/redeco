import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';

/** Kết quả chuẩn cho mọi mutation từ superadmin console. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Chặn mọi mutation nếu người gọi không phải superadmin (kiểm tra JWT server-side). */
export async function assertPlatformAdmin(): Promise<void> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata['is_platform_admin'] !== true) {
    throw new Error('Không có quyền thực hiện thao tác này.');
  }
}

// ------------------------------------------------------------
// Tạo công ty (khách hàng) + tài khoản admin của công ty
// ------------------------------------------------------------

export interface CreateCompanyInput {
  name: string;
  slug: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  /** Node module cấp cho công ty ngay khi tạo (subtree). Rỗng = chưa cấp. */
  moduleIds: string[];
  /** Số người dùng tối đa của hợp đồng tự sinh (khi có moduleIds). */
  seats: number;
}

export interface CreateCompanyOutput {
  tenantId: string;
  adminEmail: string;
  contractCode: string | null;
}

export async function createCompanyWithAdmin(
  input: CreateCompanyInput,
): Promise<ActionResult<CreateCompanyOutput>> {
  await assertPlatformAdmin();

  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const adminFullName = input.adminFullName.trim();
  const adminEmail = input.adminEmail.trim().toLowerCase();

  if (!name) return { ok: false, error: 'Tên công ty không được để trống.' };
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, error: 'Subdomain chỉ gồm chữ thường, số và dấu gạch ngang (vd: cong-ty-a).' };
  }
  if (!EMAIL_PATTERN.test(adminEmail)) return { ok: false, error: 'Email admin không hợp lệ.' };
  if (input.adminPassword.length < 6) {
    return { ok: false, error: 'Mật khẩu admin phải có ít nhất 6 ký tự.' };
  }

  const admin = createAdminClient();

  // 1) Tạo tenant (lưu email admin vào attributes để console hiển thị)
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name, slug, attributes: { admin_email: adminEmail } })
    .select('id')
    .single();
  if (tenantError) {
    return {
      ok: false,
      error: tenantError.code === '23505'
        ? `Subdomain "${slug}" đã được dùng. Hãy chọn tên khác.`
        : `Tạo công ty thất bại: ${tenantError.message}`,
    };
  }
  const tenantId = (tenant as { id: string }).id;

  // 2) Tạo auth user cho admin công ty (tenant_id vào app_metadata -> JWT)
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: input.adminPassword,
    email_confirm: true,
    app_metadata: { tenant_id: tenantId },
    user_metadata: { full_name: adminFullName },
  });
  if (userError || !created.user) {
    await admin.from('tenants').delete().eq('id', tenantId);
    const msg = userError?.message ?? 'unknown';
    return {
      ok: false,
      error: msg.toLowerCase().includes('already')
        ? `Email "${adminEmail}" đã có tài khoản trên hệ thống (1 email = 1 công ty).`
        : `Tạo tài khoản admin thất bại: ${msg}`,
    };
  }

  // 3) Hồ sơ user trong tenant với vai trò owner
  const { error: profileError } = await admin.from('user_profiles').insert({
    id: created.user.id,
    tenant_id: tenantId,
    full_name: adminFullName,
    role: 'owner',
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from('tenants').delete().eq('id', tenantId);
    return { ok: false, error: `Tạo hồ sơ admin thất bại: ${profileError.message}` };
  }

  // 4) Cấp module ngay khi tạo: tự sinh hợp đồng active 1 năm + entitlements
  let contractCode: string | null = null;
  if (input.moduleIds.length > 0) {
    const granted = await grantModulesViaContract(admin, tenantId, input.moduleIds, input.seats);
    if (!granted.ok) {
      await admin.from('user_profiles').delete().eq('id', created.user.id);
      await admin.auth.admin.deleteUser(created.user.id);
      await admin.from('tenants').delete().eq('id', tenantId);
      return granted;
    }
    contractCode = granted.data.contractCode;
  }

  return { ok: true, data: { tenantId, adminEmail, contractCode } };
}

// ------------------------------------------------------------
// Gán module cho công ty (cây module, ngữ nghĩa subtree)
// Cơ chế: sửa entitlements của hợp đồng đang hiệu lực;
// chưa có hợp đồng hiệu lực -> tự sinh hợp đồng active 1 năm.
// ------------------------------------------------------------

function autoContractCode(): string {
  const now = new Date();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HD-${now.getFullYear()}-${rand}`;
}

async function grantModulesViaContract(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  moduleIds: string[],
  seats: number,
): Promise<ActionResult<{ contractCode: string }>> {
  const startsOn = new Date().toISOString().slice(0, 10);
  const ends = new Date();
  ends.setFullYear(ends.getFullYear() + 1);

  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .insert({
      tenant_id: tenantId,
      code: autoContractCode(),
      status: 'active',
      starts_on: startsOn,
      ends_on: ends.toISOString().slice(0, 10),
      seats: Number.isInteger(seats) && seats > 0 ? seats : 10,
      notes: 'Tự sinh khi cấp module từ trang Công ty.',
    })
    .select('id, code')
    .single();
  if (contractError) {
    return { ok: false, error: `Tự sinh hợp đồng thất bại: ${contractError.message}` };
  }
  const row = contract as { id: string; code: string };

  const { error: entError } = await admin
    .from('contract_entitlements')
    .insert(moduleIds.map((moduleId) => ({ contract_id: row.id, module_id: moduleId })));
  if (entError) {
    await admin.from('contracts').delete().eq('id', row.id);
    return { ok: false, error: `Gán module thất bại: ${entError.message}` };
  }
  return { ok: true, data: { contractCode: row.code } };
}

/**
 * Đặt lại danh sách module của công ty (thay toàn bộ entitlements
 * của hợp đồng đang hiệu lực; chưa có thì tự sinh hợp đồng mới).
 */
export async function setTenantModules(
  tenantId: string,
  moduleIds: string[],
): Promise<ActionResult<{ contractCode: string | null }>> {
  await assertPlatformAdmin();

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: current } = await admin
    .from('contracts')
    .select('id, code')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('starts_on', today)
    .gte('ends_on', today)
    .order('ends_on', { ascending: false })
    .limit(1)
    .maybeSingle();
  const contract = current as { id: string; code: string } | null;

  if (!contract) {
    if (moduleIds.length === 0) return { ok: true, data: { contractCode: null } };
    const granted = await grantModulesViaContract(admin, tenantId, moduleIds, 10);
    if (!granted.ok) return granted;
    return { ok: true, data: { contractCode: granted.data.contractCode } };
  }

  const { error: delError } = await admin
    .from('contract_entitlements')
    .delete()
    .eq('contract_id', contract.id);
  if (delError) return { ok: false, error: `Cập nhật module thất bại: ${delError.message}` };

  if (moduleIds.length > 0) {
    const { error: insError } = await admin
      .from('contract_entitlements')
      .insert(moduleIds.map((moduleId) => ({ contract_id: contract.id, module_id: moduleId })));
    if (insError) return { ok: false, error: `Gán module thất bại: ${insError.message}` };
  }
  return { ok: true, data: { contractCode: contract.code } };
}

// ------------------------------------------------------------
// Lập hợp đồng + gán module (entitlements, ngữ nghĩa subtree)
// ------------------------------------------------------------

export interface CreateContractInput {
  tenantId: string;
  code: string;
  startsOn: string; // yyyy-mm-dd
  endsOn: string;
  seats: number;
  notes: string;
  moduleIds: string[];
  activateNow: boolean;
}

export async function createContract(
  input: CreateContractInput,
): Promise<ActionResult<{ contractId: string }>> {
  await assertPlatformAdmin();

  const code = input.code.trim();
  if (!code) return { ok: false, error: 'Mã hợp đồng không được để trống.' };
  if (!input.tenantId) return { ok: false, error: 'Hãy chọn công ty.' };
  if (!input.startsOn || !input.endsOn || input.endsOn < input.startsOn) {
    return { ok: false, error: 'Thời hạn không hợp lệ (ngày kết thúc phải sau ngày bắt đầu).' };
  }
  if (!Number.isInteger(input.seats) || input.seats <= 0) {
    return { ok: false, error: 'Số seats phải là số nguyên dương.' };
  }
  if (input.moduleIds.length === 0) {
    return { ok: false, error: 'Hãy chọn ít nhất một module cho hợp đồng.' };
  }

  const admin = createAdminClient();

  const { data: contract, error: contractError } = await admin
    .from('contracts')
    .insert({
      tenant_id: input.tenantId,
      code,
      status: input.activateNow ? 'active' : 'draft',
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      seats: input.seats,
      notes: input.notes.trim() || null,
    })
    .select('id')
    .single();
  if (contractError) {
    return {
      ok: false,
      error: contractError.code === '23505'
        ? `Mã hợp đồng "${code}" đã tồn tại.`
        : `Lập hợp đồng thất bại: ${contractError.message}`,
    };
  }
  const contractId = (contract as { id: string }).id;

  const { error: entError } = await admin.from('contract_entitlements').insert(
    input.moduleIds.map((moduleId) => ({ contract_id: contractId, module_id: moduleId })),
  );
  if (entError) {
    await admin.from('contracts').delete().eq('id', contractId);
    return { ok: false, error: `Gán module thất bại: ${entError.message}` };
  }

  return { ok: true, data: { contractId } };
}

// ------------------------------------------------------------
// Đổi trạng thái hợp đồng (kích hoạt / tạm dừng / chấm dứt)
// ------------------------------------------------------------

export type ContractStatusAction = 'active' | 'suspended' | 'terminated';

export async function setContractStatus(
  contractId: string,
  status: ContractStatusAction,
): Promise<ActionResult> {
  await assertPlatformAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from('contracts').update({ status }).eq('id', contractId);
  if (error) return { ok: false, error: `Đổi trạng thái thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

/** Gia hạn hợp đồng: đổi ngày kết thúc và/hoặc số seats. */
export async function extendContract(
  contractId: string,
  endsOn: string,
  seats: number,
): Promise<ActionResult> {
  await assertPlatformAdmin();

  if (!endsOn) return { ok: false, error: 'Hãy chọn ngày kết thúc mới.' };
  if (!Number.isInteger(seats) || seats <= 0) {
    return { ok: false, error: 'Số seats phải là số nguyên dương.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('contracts')
    .update({ ends_on: endsOn, seats })
    .eq('id', contractId);
  if (error) {
    return {
      ok: false,
      error: error.message.includes('check')
        ? 'Ngày kết thúc phải sau ngày bắt đầu hợp đồng.'
        : `Gia hạn thất bại: ${error.message}`,
    };
  }
  return { ok: true, data: undefined };
}

// ------------------------------------------------------------
// Quản trị công ty: tạm dừng / kích hoạt, đặt lại mật khẩu admin
// ------------------------------------------------------------

export async function setTenantStatus(
  tenantId: string,
  status: 'active' | 'suspended',
): Promise<ActionResult> {
  await assertPlatformAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from('tenants').update({ status }).eq('id', tenantId);
  if (error) return { ok: false, error: `Đổi trạng thái công ty thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

/** Đặt lại mật khẩu cho admin (owner) của công ty. */
export async function resetCompanyAdminPassword(
  tenantId: string,
  newPassword: string,
): Promise<ActionResult<{ adminEmail: string }>> {
  await assertPlatformAdmin();

  if (newPassword.length < 6) {
    return { ok: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }

  const admin = createAdminClient();
  const { data: owner, error: ownerError } = await admin
    .from('user_profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle();
  if (ownerError || !owner) {
    return { ok: false, error: 'Không tìm thấy tài khoản admin (owner) của công ty này.' };
  }

  const ownerId = (owner as { id: string }).id;
  const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(ownerId, {
    password: newPassword,
  });
  if (updateError) {
    return { ok: false, error: `Đặt lại mật khẩu thất bại: ${updateError.message}` };
  }
  return { ok: true, data: { adminEmail: updated.user.email ?? '' } };
}

// ------------------------------------------------------------
// Danh mục module: CHỈ ĐỌC trong superadmin (yêu cầu người dùng
// 2026-08-01). Thay đổi catalog đi qua migration/seed script.
// ------------------------------------------------------------

// ------------------------------------------------------------
// Tham số hệ thống
// ------------------------------------------------------------

export async function updatePlatformSetting(
  key: string,
  rawJson: string,
): Promise<ActionResult> {
  await assertPlatformAdmin();

  let value: unknown;
  try {
    value = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'Giá trị không phải JSON hợp lệ.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('platform_settings').update({ value }).eq('key', key);
  if (error) return { ok: false, error: `Lưu tham số thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}
