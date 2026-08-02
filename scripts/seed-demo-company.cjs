// Seed công ty demo để trải nghiệm module Kinh doanh:
// - Tenant "Công ty Demo" (slug: demo), admin demo@optimake.com / Demo@123
// - Hợp đồng active 1 năm với module kinh-doanh
// - 3 khách hàng + 4 sản phẩm có tồn kho
// Chạy lại sẽ báo đã tồn tại (không tạo trùng).
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

  try {
    const existing = await pg.query(`select id from public.tenants where slug = 'demo'`);
    if (existing.rows.length > 0) {
      console.log('Công ty demo đã tồn tại — không tạo lại.');
      return;
    }

    const tenantId = (
      await pg.query(
        `insert into public.tenants (name, slug, attributes) values ('Công ty Demo', 'demo', '{"admin_email":"demo@optimake.com"}') returning id`,
      )
    ).rows[0].id;

    const res = await fetch(`${base}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'demo@optimake.com',
        password: 'Demo@123',
        email_confirm: true,
        app_metadata: { tenant_id: tenantId, tenant_slug: 'demo' },
        user_metadata: { full_name: 'Quản trị Demo' },
      }),
    });
    if (!res.ok) throw new Error(`Tạo user demo thất bại: ${await res.text()}`);
    const userId = (await res.json()).id;
    await pg.query(
      `insert into public.user_profiles (id, tenant_id, full_name, role) values ($1, $2, 'Quản trị Demo', 'owner')`,
      [userId, tenantId],
    );

    const moduleId = (await pg.query(`select id from public.modules where key = 'kinh-doanh'`))
      .rows[0].id;
    const contractId = (
      await pg.query(
        `insert into public.contracts (tenant_id, code, status, starts_on, ends_on, seats, notes)
         values ($1, 'HD-DEMO-2026', 'active', current_date, current_date + interval '1 year', 10, 'Hợp đồng demo module Kinh doanh') returning id`,
        [tenantId],
      )
    ).rows[0].id;
    await pg.query(
      `insert into public.contract_entitlements (contract_id, module_id) values ($1, $2)`,
      [contractId, moduleId],
    );

    await pg.query(
      `insert into public.customers (tenant_id, code, name, kind, tax_code, credit_limit, attributes) values
       ($1, 'KH-0001', 'Công ty TNHH Cơ khí Thành Đạt', 'b2b', '0312345678', 500000000, '{"phone":"028 3812 3456","email":"muahang@thanhdat.vn","address":"KCN Tân Bình, TP.HCM"}'),
       ($1, 'KH-0002', 'Đại lý Máy móc Miền Trung', 'dai-ly', '0409876543', 200000000, '{"phone":"0236 371 2345","email":"daily@mmmt.vn","address":"Đà Nẵng"}'),
       ($1, 'KH-0003', 'Anh Nguyễn Văn Bình', 'b2c', null, null, '{"phone":"0901 234 567","email":"binh.nv@gmail.com","address":"Q.7, TP.HCM"}')`,
      [tenantId],
    );

    const products = await pg.query(
      `insert into public.products (tenant_id, sku, name, uom, base_price) values
       ($1, 'BC-6M', 'Băng chuyền con lăn 6m', 'bộ', 32000000),
       ($1, 'BC-12M', 'Băng chuyền con lăn 12m', 'bộ', 58000000),
       ($1, 'CL-STD', 'Con lăn thay thế tiêu chuẩn', 'cái', 450000),
       ($1, 'DC-PVC', 'Dây curoa PVC 10m', 'cuộn', 1200000)
       returning id`,
      [tenantId],
    );
    const stocks = [12, 4, 500, 80];
    for (let i = 0; i < products.rows.length; i++) {
      await pg.query(
        `insert into public.product_stock (product_id, tenant_id, qty_on_hand) values ($1, $2, $3)`,
        [products.rows[i].id, tenantId, stocks[i]],
      );
    }

    console.log('Seed công ty demo THÀNH CÔNG ✓');
    console.log('  Đăng nhập: demo@optimake.com / Demo@123');
    console.log('  Dữ liệu: 3 khách hàng, 4 sản phẩm có tồn kho, hợp đồng kinh-doanh 1 năm.');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
