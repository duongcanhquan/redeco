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

  // 1) Tạo tenant
  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name, slug })
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
