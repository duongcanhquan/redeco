// Smoke test module Kinh doanh (Order-to-Cash) DƯỚI JWT CỦA USER CÔNG TY:
// provision tenant + owner + contract(kinh-doanh) -> đăng nhập -> khách hàng,
// sản phẩm + tồn, báo giá -> duyệt, đơn hàng + ATP, giao hàng (trừ tồn),
// hóa đơn -> thu tiền. Kiểm cả guard decrement_stock. Dọn sạch khi xong.
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
  let tenantId, userId, contractId;
  let step = 0;
  const log = (msg) => console.log(`${++step}. ${msg}`);

  try {
    // --- Provision (service role) ---
    tenantId = (
      await pg.query(`insert into public.tenants (name, slug) values ($1, $2) returning id`, [
        `Sales Test ${suffix}`,
        `sales-test-${suffix}`,
      ])
    ).rows[0].id;
    const email = `sales-owner-${suffix}@example.com`;
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
    if (!res.ok) throw new Error(`Tạo user: ${await res.text()}`);
    userId = (await res.json()).id;
    await pg.query(
      `insert into public.user_profiles (id, tenant_id, full_name, role) values ($1, $2, 'Sales Owner', 'owner')`,
      [userId, tenantId],
    );
    const moduleId = (await pg.query(`select id from public.modules where key = 'kinh-doanh'`))
      .rows[0].id;
    contractId = (
      await pg.query(
        `insert into public.contracts (tenant_id, code, status, starts_on, ends_on, seats)
         values ($1, $2, 'active', current_date, current_date + interval '1 year', 5) returning id`,
        [tenantId, `SALES-${suffix}`],
      )
    ).rows[0].id;
    await pg.query(
      `insert into public.contract_entitlements (contract_id, module_id) values ($1, $2)`,
      [contractId, moduleId],
    );
    log('Provision tenant + owner + contract(kinh-doanh) OK');

    // --- Đăng nhập như user công ty ---
    const login = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Test123456' }),
    });
    if (!login.ok) throw new Error(`Đăng nhập: ${await login.text()}`);
    const token = (await login.json()).access_token;
    const h = {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
    const rest = async (pathname, options = {}) => {
      const r = await fetch(`${base}/rest/v1${pathname}`, { headers: h, ...options, headers: { ...h, ...(options.headers ?? {}) } });
      const text = await r.text();
      if (!r.ok) throw new Error(`${pathname}: ${text}`);
      return text ? JSON.parse(text) : null;
    };
    log('Đăng nhập user công ty OK (JWT có tenant_id)');

    // --- Khách hàng với hạn mức 100 triệu ---
    const customer = (
      await rest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          code: 'KH-0001',
          name: 'Công ty Thử Nghiệm',
          kind: 'b2b',
          credit_limit: 100_000_000,
        }),
      })
    )[0];
    log(`Tạo khách hàng OK (RLS + has_module_access pass): ${customer.code}`);

    // --- Sản phẩm + tồn kho 10 ---
    const product = (
      await rest('/products', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          sku: 'SP-001',
          name: 'Băng chuyền 6m',
          base_price: 30_000_000,
        }),
      })
    )[0];
    await rest('/product_stock', {
      method: 'POST',
      body: JSON.stringify({ product_id: product.id, tenant_id: tenantId, qty_on_hand: 10 }),
    });
    log('Tạo sản phẩm + tồn kho 10 OK');

    // --- Báo giá: 2 x 30tr, duyệt ---
    const quote = (
      await rest('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          code: 'BG-0001',
          customer_id: customer.id,
          total: 60_000_000,
        }),
      })
    )[0];
    await rest('/quotation_items', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        quotation_id: quote.id,
        product_id: product.id,
        product_name: product.name,
        qty: 2,
        unit_price: 30_000_000,
        line_total: 60_000_000,
      }),
    });
    await rest(`/quotations?id=eq.${quote.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'sent' }) });
    await rest(`/quotations?id=eq.${quote.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
    log('Báo giá tạo + gửi + duyệt OK');

    // --- Đơn hàng 60tr: credit check pass (60 <= 100), ATP đủ (2 <= 10) ---
    const order = (
      await rest('/sales_orders', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          code: 'DH-0001',
          customer_id: customer.id,
          quotation_id: quote.id,
          total: 60_000_000,
        }),
      })
    )[0];
    await rest('/sales_order_items', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: tenantId,
        sales_order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        qty: 2,
        unit_price: 30_000_000,
        line_total: 60_000_000,
        atp_qty: 10,
      }),
    });
    await rest(`/sales_orders?id=eq.${order.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'confirmed',
        credit_check: { passed: true, outstanding: 0, order_total: 60_000_000, credit_limit: 100_000_000 },
      }),
    });
    log('Đơn hàng tạo + xác nhận (credit 60tr ≤ 100tr, ATP 2 ≤ 10) OK');

    // --- Giao hàng: trừ tồn 2 -> còn 8; guard trừ 100 phải fail ---
    const delivery = (
      await rest('/delivery_notes', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId, code: 'GH-0001', sales_order_id: order.id }),
      })
    )[0];
    const dec = await rest('/rpc/decrement_stock', {
      method: 'POST',
      body: JSON.stringify({ p_product_id: product.id, p_qty: 2 }),
    });
    if (dec !== true) throw new Error('decrement_stock 2 phải trả true');
    const decFail = await rest('/rpc/decrement_stock', {
      method: 'POST',
      body: JSON.stringify({ p_product_id: product.id, p_qty: 100 }),
    });
    if (decFail !== false) throw new Error('decrement_stock 100 phải trả false (chống âm kho)');
    const stock = await rest(`/product_stock?product_id=eq.${product.id}&select=qty_on_hand`);
    if (Number(stock[0].qty_on_hand) !== 8) throw new Error(`Tồn phải = 8, thực tế ${stock[0].qty_on_hand}`);
    await rest(`/delivery_notes?id=eq.${delivery.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'shipped', shipped_at: new Date().toISOString() }),
    });
    await rest(`/sales_orders?id=eq.${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) });
    log('Xuất kho OK: tồn 10 → 8, guard chống âm kho hoạt động');

    // --- Hóa đơn: unpaid -> công nợ 60tr -> paid ---
    const invoice = (
      await rest('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          code: 'HD-0001',
          sales_order_id: order.id,
          customer_id: customer.id,
          total: 60_000_000,
        }),
      })
    )[0];
    const unpaid = await rest(`/invoices?status=eq.unpaid&customer_id=eq.${customer.id}&select=total`);
    const outstanding = unpaid.reduce((s, r) => s + Number(r.total), 0);
    if (outstanding !== 60_000_000) throw new Error(`Công nợ phải = 60tr, thực tế ${outstanding}`);
    await rest(`/invoices?id=eq.${invoice.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'paid', paid_at: new Date().toISOString() }),
    });
    log('Hóa đơn + công nợ 60tr + thu tiền OK');

    // --- RLS: tắt hợp đồng -> mất quyền module -> đọc customers phải rỗng ---
    await pg.query(`update public.contracts set status = 'suspended' where id = $1`, [contractId]);
    const blocked = await rest('/customers?select=id');
    if (blocked.length !== 0) throw new Error('Hợp đồng tạm dừng mà vẫn đọc được dữ liệu!');
    log('RLS chặn đúng khi hợp đồng tạm dừng (has_module_access = false)');

    console.log('\nTẤT CẢ BƯỚC PASS ✓');
  } finally {
    if (tenantId) {
      await pg.query(`delete from public.invoices where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.delivery_notes where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.sales_orders where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.quotations where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.products where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.customers where tenant_id = $1`, [tenantId]);
      await pg.query(`delete from public.contracts where tenant_id = $1`, [tenantId]);
    }
    if (userId) {
      await pg.query(`delete from public.user_profiles where id = $1`, [userId]);
      await fetch(`${base}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: adminHeaders });
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
