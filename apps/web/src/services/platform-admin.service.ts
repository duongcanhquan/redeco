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
}

export interface CreateCompanyOutput {
  tenantId: string;
  adminEmail: string;
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

  return { ok: true, data: { tenantId, adminEmail } };
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
// Quản trị danh mục module (thêm/sửa/bật-tắt không cần deploy)
// ------------------------------------------------------------

const KEY_SEGMENT_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface CreateModuleNodeInput {
  parentId: string | null;
  keySegment: string;
  name: string;
  description: string;
  kind: 'module' | 'feature';
}

export async function createModuleNode(
  input: CreateModuleNodeInput,
): Promise<ActionResult<{ moduleId: string }>> {
  await assertPlatformAdmin();

  const name = input.name.trim();
  const keySegment = input.keySegment.trim().toLowerCase();
  if (!name) return { ok: false, error: 'Tên module không được để trống.' };
  if (!KEY_SEGMENT_PATTERN.test(keySegment)) {
    return { ok: false, error: 'Khóa chỉ gồm chữ thường, số, dấu gạch ngang (vd: bao-cao).' };
  }

  const admin = createAdminClient();

  // Key đầy đủ = key cha + "." + segment (dotted-path, ADR-008)
  let fullKey = keySegment;
  if (input.parentId) {
    const { data: parent, error: parentError } = await admin
      .from('modules')
      .select('key')
      .eq('id', input.parentId)
      .single();
    if (parentError || !parent) return { ok: false, error: 'Không tìm thấy module cha.' };
    fullKey = `${(parent as { key: string }).key}.${keySegment}`;
  }

  const { data: node, error } = await admin
    .from('modules')
    .insert({
      parent_id: input.parentId,
      key: fullKey,
      name,
      description: input.description.trim() || null,
      kind: input.kind,
    })
    .select('id')
    .single();
  if (error) {
    return {
      ok: false,
      error: error.code === '23505'
        ? `Khóa "${fullKey}" đã tồn tại trong danh mục.`
        : `Thêm module thất bại: ${error.message}`,
    };
  }
  return { ok: true, data: { moduleId: (node as { id: string }).id } };
}

export async function updateModuleNode(
  moduleId: string,
  patch: { name: string; description: string },
): Promise<ActionResult> {
  await assertPlatformAdmin();

  const name = patch.name.trim();
  if (!name) return { ok: false, error: 'Tên module không được để trống.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('modules')
    .update({ name, description: patch.description.trim() || null })
    .eq('id', moduleId);
  if (error) return { ok: false, error: `Sửa module thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

export async function setModuleActive(
  moduleId: string,
  isActive: boolean,
): Promise<ActionResult> {
  await assertPlatformAdmin();

  const admin = createAdminClient();
  const { error } = await admin
    .from('modules')
    .update({ is_active: isActive })
    .eq('id', moduleId);
  if (error) return { ok: false, error: `Đổi trạng thái module thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

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
