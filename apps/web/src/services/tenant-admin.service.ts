import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildModuleTree, listModules, type ModuleTreeNode } from '@/services/platform.service';
import { getTenantContext, type ActionResult, type TenantContext } from '@/services/sales.service';

/** Chỉ owner/admin của công ty được quản trị thành viên. */
export async function assertTenantAdmin(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    throw new Error('Chỉ quản trị công ty (owner/admin) được thực hiện thao tác này.');
  }
  return ctx;
}

// ------------------------------------------------------------
// Đọc: module công ty được cấp, seats, danh sách thành viên
// ------------------------------------------------------------

/** Toàn bộ module_id công ty được cấp (đã mở rộng subtree, theo hợp đồng hiệu lực). */
export async function getTenantEntitledIds(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('tenant_entitled_module_ids', {
    p_tenant_id: tenantId,
  });
  if (error) throw new Error(`Không tải được module của công ty: ${error.message}`);
  return new Set((data ?? []) as string[]);
}

/** Cây module đã lọc: chỉ còn các node công ty được cấp (dùng cho gán module thành viên + cài đặt). */
export async function getEntitledModuleTree(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ tree: ModuleTreeNode[]; entitledIds: Set<string> }> {
  const [modules, entitledIds] = await Promise.all([
    listModules(supabase),
    getTenantEntitledIds(supabase, tenantId),
  ]);
  const tree = buildModuleTree(modules.filter((m) => m.is_active && entitledIds.has(m.id)));
  return { tree, entitledIds };
}

export interface SeatInfo {
  used: number;
  total: number | null; // null = chưa có hợp đồng hiệu lực
  contractCode: string | null;
  endsOn: string | null;
}

export async function getSeatInfo(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<SeatInfo> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ count }, { data: contract }] = await Promise.all([
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('contracts')
      .select('code, seats, ends_on')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .lte('starts_on', today)
      .gte('ends_on', today)
      .order('ends_on', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const row = contract as { code: string; seats: number; ends_on: string } | null;
  return {
    used: count ?? 0,
    total: row?.seats ?? null,
    contractCode: row?.code ?? null,
    endsOn: row?.ends_on ?? null,
  };
}

export interface MemberRow {
  id: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'member';
  attributes: { email?: string };
  created_at: string;
  user_module_assignments?: { module_id: string }[];
}

export async function listMembers(supabase: SupabaseClient): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, role, attributes, created_at, user_module_assignments(module_id)')
    .order('created_at');
  if (error) throw new Error(`Không tải được danh sách thành viên: ${error.message}`);
  return (data ?? []) as unknown as MemberRow[];
}

// ------------------------------------------------------------
// Mutations: tạo / sửa / xóa thành viên (dùng service role sau khi
// đã xác thực người gọi là owner/admin CỦA CHÍNH tenant đó)
// ------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateMemberInput {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'member';
  moduleIds: string[];
}

export async function createMember(
  input: CreateMemberInput,
): Promise<ActionResult<{ userId: string; email: string }>> {
  const ctx = await assertTenantAdmin();

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: 'Tên thành viên không được để trống.' };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: 'Email không hợp lệ.' };
  if (input.password.length < 6) {
    return { ok: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
  }

  // Seat limit theo hợp đồng hiệu lực
  const seat = await getSeatInfo(ctx.supabase, ctx.tenantId);
  if (seat.total !== null && seat.used >= seat.total) {
    return {
      ok: false,
      error: `Đã dùng hết ${seat.total} seats của hợp đồng ${seat.contractCode}. Liên hệ Optimake để nâng cấp.`,
    };
  }

  // Member phải được phân công module trong phạm vi công ty được cấp
  if (input.role === 'member' && input.moduleIds.length > 0) {
    const entitled = await getTenantEntitledIds(ctx.supabase, ctx.tenantId);
    for (const id of input.moduleIds) {
      if (!entitled.has(id)) {
        return { ok: false, error: 'Có module nằm ngoài phạm vi công ty được cấp.' };
      }
    }
  }

  const admin = createAdminClient();

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: { tenant_id: ctx.tenantId },
    user_metadata: { full_name: fullName },
  });
  if (userError || !created.user) {
    const msg = userError?.message ?? 'unknown';
    return {
      ok: false,
      error: msg.toLowerCase().includes('already')
        ? `Email "${email}" đã có tài khoản trên hệ thống.`
        : `Tạo tài khoản thất bại: ${msg}`,
    };
  }

  const { error: profileError } = await admin.from('user_profiles').insert({
    id: created.user.id,
    tenant_id: ctx.tenantId,
    full_name: fullName,
    role: input.role,
    attributes: { email },
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Tạo hồ sơ thành viên thất bại: ${profileError.message}` };
  }

  if (input.role === 'member' && input.moduleIds.length > 0) {
    const { error: assignError } = await admin.from('user_module_assignments').insert(
      input.moduleIds.map((moduleId) => ({
        tenant_id: ctx.tenantId,
        user_id: created.user.id,
        module_id: moduleId,
        access_level: 'edit',
      })),
    );
    if (assignError) {
      await admin.from('user_profiles').delete().eq('id', created.user.id);
      await admin.auth.admin.deleteUser(created.user.id);
      return { ok: false, error: `Phân công module thất bại: ${assignError.message}` };
    }
  }

  return { ok: true, data: { userId: created.user.id, email } };
}

/** Kiểm tra target thuộc tenant của người gọi và không phải owner. */
async function getEditableTarget(
  ctx: TenantContext,
  userId: string,
): Promise<{ role: string } | { error: string }> {
  const { data } = await ctx.supabase
    .from('user_profiles')
    .select('role, tenant_id')
    .eq('id', userId)
    .maybeSingle();
  const target = data as { role: string; tenant_id: string } | null;
  if (!target || target.tenant_id !== ctx.tenantId) {
    return { error: 'Không tìm thấy thành viên trong công ty của bạn.' };
  }
  if (target.role === 'owner') {
    return { error: 'Không thể thao tác trên tài khoản chủ công ty (owner).' };
  }
  return { role: target.role };
}

export interface UpdateMemberInput {
  role: 'admin' | 'member';
  moduleIds: string[];
}

export async function updateMember(
  userId: string,
  input: UpdateMemberInput,
): Promise<ActionResult> {
  const ctx = await assertTenantAdmin();
  if (userId === ctx.userId) {
    return { ok: false, error: 'Không thể tự đổi vai trò/phân công của chính mình.' };
  }
  const target = await getEditableTarget(ctx, userId);
  if ('error' in target) return { ok: false, error: target.error };

  if (input.role === 'member' && input.moduleIds.length > 0) {
    const entitled = await getTenantEntitledIds(ctx.supabase, ctx.tenantId);
    for (const id of input.moduleIds) {
      if (!entitled.has(id)) {
        return { ok: false, error: 'Có module nằm ngoài phạm vi công ty được cấp.' };
      }
    }
  }

  const admin = createAdminClient();
  const { error: roleError } = await admin
    .from('user_profiles')
    .update({ role: input.role })
    .eq('id', userId);
  if (roleError) return { ok: false, error: `Đổi vai trò thất bại: ${roleError.message}` };

  // Thay toàn bộ phân công (admin không cần phân công — thấy mọi module của công ty)
  const { error: delError } = await admin
    .from('user_module_assignments')
    .delete()
    .eq('user_id', userId);
  if (delError) return { ok: false, error: `Cập nhật phân công thất bại: ${delError.message}` };

  if (input.role === 'member' && input.moduleIds.length > 0) {
    const { error: insError } = await admin.from('user_module_assignments').insert(
      input.moduleIds.map((moduleId) => ({
        tenant_id: ctx.tenantId,
        user_id: userId,
        module_id: moduleId,
        access_level: 'edit',
      })),
    );
    if (insError) return { ok: false, error: `Phân công module thất bại: ${insError.message}` };
  }
  return { ok: true, data: undefined };
}

export async function resetMemberPassword(
  userId: string,
  newPassword: string,
): Promise<ActionResult> {
  const ctx = await assertTenantAdmin();
  if (newPassword.length < 6) {
    return { ok: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
  }
  const target = await getEditableTarget(ctx, userId);
  if ('error' in target) return { ok: false, error: target.error };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { ok: false, error: `Đặt lại mật khẩu thất bại: ${error.message}` };
  return { ok: true, data: undefined };
}

export async function removeMember(userId: string): Promise<ActionResult> {
  const ctx = await assertTenantAdmin();
  if (userId === ctx.userId) return { ok: false, error: 'Không thể tự xóa chính mình.' };
  const target = await getEditableTarget(ctx, userId);
  if ('error' in target) return { ok: false, error: target.error };

  const admin = createAdminClient();
  await admin.from('user_module_assignments').delete().eq('user_id', userId);
  const { error: profileError } = await admin.from('user_profiles').delete().eq('id', userId);
  if (profileError) return { ok: false, error: `Xóa hồ sơ thất bại: ${profileError.message}` };
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) return { ok: false, error: `Xóa tài khoản thất bại: ${authError.message}` };
  return { ok: true, data: undefined };
}
