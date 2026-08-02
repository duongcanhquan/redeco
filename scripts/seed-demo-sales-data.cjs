/**
 * Bổ sung chứng từ demo cho tenant slug=demo — phục vụ hub/biểu đồ.
 * Idempotent: nếu đã có mã BG-DEMO-01 thì bỏ qua.
 *
 * Chạy: node scripts/seed-demo-sales-data.cjs
 */
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

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main() {
  const env = loadEnv(path.join(__dirname, '..', 'apps', 'api', '.env'));
  const pg = new Client({ connectionString: env.DIRECT_URL });
  await pg.connect();

  try {
    const tenant = await pg.query(`select id from public.tenants where slug = 'demo'`);
    if (tenant.rows.length === 0) {
      throw new Error('Chưa có tenant demo — chạy scripts/seed-demo-company.cjs trước.');
    }
    const tenantId = tenant.rows[0].id;

    const exists = await pg.query(
      `select 1 from public.quotations where tenant_id = $1 and code = 'BG-DEMO-01'`,
      [tenantId],
    );
    if (exists.rows.length > 0) {
      console.log('Dữ liệu chứng từ demo đã có — bỏ qua.');
      return;
    }

    const customers = (
      await pg.query(
        `select id, code from public.customers where tenant_id = $1 order by code`,
        [tenantId],
      )
    ).rows;
    const products = (
      await pg.query(
        `select id, sku, name, base_price from public.products where tenant_id = $1 order by sku`,
        [tenantId],
      )
    ).rows;
    if (customers.length < 2 || products.length < 2) {
      throw new Error('Thiếu khách hàng / sản phẩm demo.');
    }

    const c1 = customers[0];
    const c2 = customers[1];
    const c3 = customers[2] ?? customers[0];
    const p1 = products[0];
    const p2 = products[1];
    const p3 = products[2] ?? products[0];

    async function insertQuote(code, customerId, status, total, createdAt) {
      const r = await pg.query(
        `insert into public.quotations
           (tenant_id, code, customer_id, status, valid_until, discount_pct, total, notes, created_at, updated_at)
         values ($1,$2,$3,$4, current_date + 30, 5, $5, 'Seed demo analytics', $6, $6)
         returning id`,
        [tenantId, code, customerId, status, total, createdAt],
      );
      const qid = r.rows[0].id;
      await pg.query(
        `insert into public.quotation_items
           (tenant_id, quotation_id, product_id, product_name, qty, unit_price, discount_pct, line_total)
         values ($1,$2,$3,$4,1,$5,0,$5)`,
        [tenantId, qid, p1.id, p1.name, Number(p1.base_price)],
      );
      return qid;
    }

    await insertQuote('BG-DEMO-01', c1.id, 'draft', 32000000, daysAgo(1));
    await insertQuote('BG-DEMO-02', c2.id, 'sent', 58000000, daysAgo(2));
    await insertQuote('BG-DEMO-03', c1.id, 'approved', 4500000, daysAgo(3));
    await insertQuote('BG-DEMO-04', c3.id, 'rejected', 1200000, daysAgo(5));
    const convertedQ = await insertQuote('BG-DEMO-05', c2.id, 'converted', 64000000, daysAgo(8));

    async function insertOrder(code, customerId, status, total, createdAt, quotationId) {
      const credit =
        status === 'draft'
          ? '{}'
          : JSON.stringify({
              passed: true,
              outstanding: 0,
              order_total: total,
              credit_limit: 500000000,
            });
      const r = await pg.query(
        `insert into public.sales_orders
           (tenant_id, code, customer_id, quotation_id, status, expected_delivery_date,
            discount_pct, total, credit_check, notes, created_at, updated_at)
         values ($1,$2,$3,$4,$5, current_date + 14, 0, $6, $7::jsonb, 'Seed demo', $8, $8)
         returning id`,
        [tenantId, code, customerId, quotationId, status, total, credit, createdAt],
      );
      const oid = r.rows[0].id;
      const prod = status === 'completed' ? p2 : p1;
      await pg.query(
        `insert into public.sales_order_items
           (tenant_id, sales_order_id, product_id, product_name, qty, unit_price, discount_pct, line_total, atp_qty)
         values ($1,$2,$3,$4,1,$5,0,$5,$6)`,
        [
          tenantId,
          oid,
          prod.id,
          prod.name,
          Number(prod.base_price),
          status === 'draft' ? null : 10,
        ],
      );
      return oid;
    }

    await insertOrder('DH-DEMO-01', c1.id, 'draft', 32000000, daysAgo(1), null);
    const oConfirmed = await insertOrder(
      'DH-DEMO-02',
      c2.id,
      'confirmed',
      58000000,
      daysAgo(2),
      null,
    );
    const oDelivering = await insertOrder(
      'DH-DEMO-03',
      c1.id,
      'delivering',
      450000,
      daysAgo(4),
      null,
    );
    const oCompleted = await insertOrder(
      'DH-DEMO-04',
      c2.id,
      'completed',
      64000000,
      daysAgo(10),
      convertedQ,
    );
    await insertOrder('DH-DEMO-05', c3.id, 'cancelled', 1200000, daysAgo(6), null);

    await pg.query(
      `insert into public.delivery_notes
         (tenant_id, code, sales_order_id, status, notes, created_at, updated_at)
       values ($1,'GH-DEMO-01',$2,'pending','Chờ xuất kho demo',$3,$3)`,
      [tenantId, oConfirmed, daysAgo(1)],
    );
    await pg.query(
      `insert into public.delivery_notes
         (tenant_id, code, sales_order_id, status, shipped_at, notes, created_at, updated_at)
       values ($1,'GH-DEMO-02',$2,'shipped',$3,'Đã giao demo',$3,$3)`,
      [tenantId, oCompleted, daysAgo(9)],
    );
    await pg.query(
      `insert into public.delivery_notes
         (tenant_id, code, sales_order_id, status, notes, created_at, updated_at)
       values ($1,'GH-DEMO-03',$2,'pending','Đang giao — chờ xuất',$3,$3)`,
      [tenantId, oDelivering, daysAgo(3)],
    );

    // Hóa đơn rải 14 ngày cho biểu đồ cột
    const invoicePlan = [
      { code: 'HD-DEMO-01', orderId: oCompleted, customerId: c2.id, total: 18000000, days: 12, paid: true },
      { code: 'HD-DEMO-02', orderId: oCompleted, customerId: c2.id, total: 22000000, days: 9, paid: true },
      { code: 'HD-DEMO-03', orderId: oCompleted, customerId: c1.id, total: 15000000, days: 7, paid: false },
      { code: 'HD-DEMO-04', orderId: oDelivering, customerId: c1.id, total: 8500000, days: 5, paid: false },
      { code: 'HD-DEMO-05', orderId: oConfirmed, customerId: c2.id, total: 12000000, days: 3, paid: true },
      { code: 'HD-DEMO-06', orderId: oConfirmed, customerId: c3.id, total: 9600000, days: 1, paid: false },
      { code: 'HD-DEMO-07', orderId: oCompleted, customerId: c1.id, total: 4100000, days: 0, paid: false },
    ];

    // Mỗi HĐ cần sales_order_id unique? Schema không unique trên sales_order_id — OK nhiều HĐ/đơn.
    // Nhưng FK sales_order phải tồn tại. Reuse orders above.

    for (const inv of invoicePlan) {
      const created = daysAgo(inv.days);
      const issued = created.toISOString().slice(0, 10);
      await pg.query(
        `insert into public.invoices
           (tenant_id, code, sales_order_id, customer_id, total, status, issued_on, paid_at, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
        [
          tenantId,
          inv.code,
          inv.orderId,
          inv.customerId,
          inv.total,
          inv.paid ? 'paid' : 'unpaid',
          issued,
          inv.paid ? created : null,
          created,
        ],
      );
    }

    // Hạ tồn 1 SKU để hiện "tồn thấp"
    await pg.query(
      `update public.product_stock set qty_on_hand = 3
       where tenant_id = $1 and product_id = $2`,
      [tenantId, p2.id],
    );
    await pg.query(
      `update public.product_stock set qty_on_hand = 0
       where tenant_id = $1 and product_id = $2`,
      [tenantId, p3.id],
    );

    console.log('Seed chứng từ demo THÀNH CÔNG ✓');
    console.log('  5 báo giá · 5 đơn · 3 giao hàng · 7 hóa đơn (14 ngày)');
    console.log('  Mở /demo/sales để xem bento + biểu đồ.');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
