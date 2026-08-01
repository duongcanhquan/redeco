// Smoke test luồng superadmin: tạo tenant + admin user + contract + entitlements,
// xác minh tenant_entitled_module_ids(), rồi DỌN SẠCH dữ liệu test.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(file) {
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return map;
}

async function main() {
  const env = loadEnv(path.join(__dirname, '..', 'apps', 'api', '.env'));
  const base = env.SUPABASE_URL;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const pg = new Client({ connectionString: env.DIRECT_URL });
  await pg.connect();

  const suffix = Date.now().toString(36);
  let tenantId, userId, contractId;

  try {
    // 1) Tenant
    const t = await pg.query(
      `insert into public.tenants (name, slug) values ($1, $2) returning id`,
      [`Test Co ${suffix}`, `test-co-${suffix}`],
    );
    tenantId = t.rows[0].id;
    console.log('1. Tạo tenant OK:', tenantId);

    // 2) Auth user (admin công ty) với app_metadata.tenant_id
    const res = await fetch(`${base}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: `test-admin-${suffix}@example.com`,
        password: 'Test123456',
        email_confirm: true,
        app_metadata: { tenant_id: tenantId },
        user_metadata: { full_name: 'Test Admin' },
      }),
    });
    if (!res.ok) throw new Error(`Tạo user thất bại: ${await res.text()}`);
    userId = (await res.json()).id;
    console.log('2. Tạo auth user OK:', userId);

    // 3) user_profiles role owner
    await pg.query(
      `insert into public.user_profiles (id, tenant_id, full_name, role) values ($1, $2, $3, 'owner')`,
      [userId, tenantId, 'Test Admin'],
    );
    console.log('3. Tạo user_profile (owner) OK');

    // 4) Contract active 1 năm + entitlement module gốc "kinh-doanh"
    const mod = await pg.query(`select id from public.modules where key = 'kinh-doanh'`);
    const moduleId = mod.rows[0].id;
    const c = await pg.query(
      `insert into public.contracts (tenant_id, code, status, starts_on, ends_on, seats)
       values ($1, $2, 'active', current_date, current_date + interval '1 year', 5) returning id`,
      [tenantId, `TEST-${suffix}`],
    );
    contractId = c.rows[0].id;
    await pg.query(
      `insert into public.contract_entitlements (contract_id, module_id) values ($1, $2)`,
      [contractId, moduleId],
    );
    console.log('4. Tạo contract + entitlement OK:', contractId);

    // 5) Kiểm tra mở rộng subtree
    const entitled = await pg.query(
      `select count(*)::int as n from public.tenant_entitled_module_ids($1)`,
      [tenantId],
    );
    console.log(`5. tenant_entitled_module_ids -> ${entitled.rows[0].n} node (kỳ vọng 8: kinh-doanh + 7 con)`);

    // 6) Đổi trạng thái hợp đồng
    await pg.query(`update public.contracts set status = 'suspended' where id = $1`, [contractId]);
    const after = await pg.query(
      `select count(*)::int as n from public.tenant_entitled_module_ids($1)`,
      [tenantId],
    );
    console.log(`6. Sau khi tạm dừng HĐ -> ${after.rows[0].n} node (kỳ vọng 0)`);

    console.log('\nTẤT CẢ BƯỚC PASS ✓');
  } finally {
    // Dọn sạch dữ liệu test
    if (contractId) await pg.query(`delete from public.contracts where id = $1`, [contractId]);
    if (userId) {
      await pg.query(`delete from public.user_profiles where id = $1`, [userId]);
      await fetch(`${base}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers });
    }
    if (tenantId) await pg.query(`delete from public.tenants where id = $1`, [tenantId]);
    await pg.end();
    console.log('Đã dọn sạch dữ liệu test.');
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
