// Smoke test quản lý thành viên + phân quyền module (dưới JWT user thật):
// 1) Owner thấy đủ module, đọc được customers.
// 2) Member được phân công NODE CON (kinh-doanh.bao-gia) -> my_module_ids
//    trả subtree bao-gia, has_module_access('kinh-doanh') = true -> đọc được sales.
// 3) Member KHÔNG được phân công -> my_module_ids rỗng -> customers bị RLS chặn.
// 4) Member (không phải admin) KHÔNG tự thêm được phân công (RLS uma_admin_insert).
// Tự dọn dữ liệu khi xong.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(file) {
  const map = {};
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return map;
}

async function main() {
  const root = path.join(__dirname, '..');
  const env = {
    ...loadEnv(path.join(root, 'apps', 'api', '.env')),
    ...loadEnv(path.join(root, 'apps', 'web', '.env.local')),
  };
  const base = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const pg = new Client({ connectionString: env.DIRECT_URL });
  await pg.connect();

  const suffix = Date.now().toString(36);
  let tenantId, contractId;
  const userIds = [];
  let step = 0;
  const log = (msg) => console.log(`${++step}. ${msg}`);

  const createUser = async (email, role) => {
    const res = await fetch(`${base}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password: 'Test123456',
        email_confirm: true,
        app_metadata: { tenant_id: tenantId },
      }),
    });
    if (!res.ok) throw new Error(`Tạo user ${email}: ${await res.text()}`);
    const id = (await res.json()).id;
    userIds.push(id);
    await pg.query(
      `insert into public.user_profiles (id, tenant_id, full_name, role, attributes) values ($1, $2, $3, $4, $5)`,
      [id, tenantId, email.split('@')[0], role, JSON.stringify({ email })],
    );
    return id;
  };

  const login = async (email) => {
    const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Test123456' }),
    });
    if (!r.ok) throw new Error(`Login ${email}: ${await r.text()}`);
    const token = (await r.json()).access_token;
    return async (pathname, options = {}) => {
      const res = await fetch(`${base}/rest/v1${pathname}`, {
        ...options,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...(options.headers ?? {}),
        },
      });
      const text = await res.text();
      return { ok: res.ok, body: text ? JSON.parse(text) : null, raw: text };
    };
  };

  try {
    // --- Provision: tenant + contract(kinh-doanh) ---
    tenantId = (
      await pg.query(`insert into public.tenants (name, slug) values ($1, $2) returning id`, [
        `Members Test ${suffix}`,
        `members-test-${suffix}`,
      ])
    ).rows[0].id;
    const moduleId = (await pg.query(`select id from public.modules where key = 'kinh-doanh'`))
      .rows[0].id;
    const baoGiaId = (
      await pg.query(`select id from public.modules where key = 'kinh-doanh.bao-gia'`)
    ).rows[0].id;
    contractId = (
      await pg.query(
        `insert into public.contracts (tenant_id, code, status, starts_on, ends_on, seats)
         values ($1, $2, 'active', current_date, current_date + interval '1 year', 5) returning id`,
        [tenantId, `MEM-${suffix}`],
      )
    ).rows[0].id;
    await pg.query(
      `insert into public.contract_entitlements (contract_id, module_id) values ($1, $2)`,
      [contractId, moduleId],
    );

    const ownerId = await createUser(`mem-owner-${suffix}@example.com`, 'owner');
    const m1Id = await createUser(`mem-baogia-${suffix}@example.com`, 'member');
    const m2Id = await createUser(`mem-trang-${suffix}@example.com`, 'member');
    // Phân công member1 CHỈ node con bao-gia
    await pg.query(
      `insert into public.user_module_assignments (tenant_id, user_id, module_id, access_level) values ($1, $2, $3, 'edit')`,
      [tenantId, m1Id, baoGiaId],
    );
    log('Provision: tenant + contract(kinh-doanh) + owner + 2 member (1 được giao bao-gia)');

    // --- Owner ---
    const owner = await login(`mem-owner-${suffix}@example.com`);
    const ownerMods = await owner('/rpc/my_module_ids', { method: 'POST', body: '{}' });
    if (!ownerMods.ok || ownerMods.body.length < 8) {
      throw new Error(`Owner phải thấy >=8 node, thấy ${ownerMods.body?.length}`);
    }
    const { body: cust } = await owner('/customers', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId, code: 'KH-T1', name: 'KH của owner' }),
    });
    if (!cust?.[0]?.id) throw new Error('Owner phải tạo được khách hàng');
    log(`Owner: my_module_ids = ${ownerMods.body.length} node, tạo customers OK`);

    // --- Member1 (được giao bao-gia) ---
    const m1 = await login(`mem-baogia-${suffix}@example.com`);
    const m1Mods = await m1('/rpc/my_module_ids', { method: 'POST', body: '{}' });
    if (!m1Mods.ok || m1Mods.body.length === 0) throw new Error('Member1 phải thấy subtree bao-gia');
    const m1Read = await m1('/customers?select=id');
    if (!m1Read.ok || m1Read.body.length !== 1) {
      throw new Error(`Member1 (giao node con) phải đọc được customers: ${m1Read.raw}`);
    }
    log(
      `Member1 (giao kinh-doanh.bao-gia): my_module_ids = ${m1Mods.body.length} node, has_module_access('kinh-doanh') qua node con OK`,
    );

    // --- Member2 (chưa phân công) ---
    const m2 = await login(`mem-trang-${suffix}@example.com`);
    const m2Mods = await m2('/rpc/my_module_ids', { method: 'POST', body: '{}' });
    if ((m2Mods.body ?? []).length !== 0) throw new Error('Member2 chưa phân công phải thấy 0 node');
    const m2Read = await m2('/customers?select=id');
    if (!m2Read.ok || m2Read.body.length !== 0) {
      throw new Error('Member2 chưa phân công phải bị RLS chặn (0 dòng)');
    }
    log('Member2 (chưa phân công): 0 node, customers bị RLS chặn đúng');

    // --- Member không tự thêm phân công được ---
    const selfAssign = await m2('/user_module_assignments', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        user_id: m2Id,
        module_id: moduleId,
        access_level: 'manage',
      }),
    });
    if (selfAssign.ok) throw new Error('Member KHÔNG được tự thêm phân công cho mình!');
    log('Member tự thêm phân công -> bị RLS từ chối đúng (chỉ owner/admin được phân công)');

    console.log('\nTẤT CẢ BƯỚC PASS ✓');
    void ownerId;
  } finally {
    if (tenantId) {
      await pg.query(`delete from public.customers where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.user_module_assignments where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.contracts where tenant_id = $1`, [tenantId]);
      for (const id of userIds) {
        await pg.query(`delete from public.user_profiles where id = $1`, [id]);
        await fetch(`${base}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: adminHeaders });
      }
      await pg.query(`delete from public.tenants where id = $1`, [tenantId]);
    }
    await pg.end();
    console.log('Đã dọn sạch dữ liệu test.');
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
