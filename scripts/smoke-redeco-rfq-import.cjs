/**
 * Smoke: parse fixture + (optional) ghi DB qua service role nếu có.
 * Chạy: pnpm exec tsx scripts/smoke-redeco-rfq-import.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('../apps/web/node_modules/xlsx');
const {
  parseRedecoRfqWorkbook,
  tagRowsForDuplicates,
  REDECO_RFQ_PACK_KEY,
} = require('../apps/web/src/lib/customiz/redeco-rfq-parse.ts');

function loadEnv(file) {
  const map = {};
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return map;
}

function fixtureBuffer() {
  const header = [
    'Báo giáSố',
    'Trạng thái',
    'Người phụ trách mua hàng',
    'Khách hàng',
    'Cơ sở khách hàng',
    'Mã hàng khách hàng',
    'Mã hàng',
    'Báo giáYêu cầuSố',
    'Tên sản phẩm',
    'Kiểu mẫu',
    'Quy cách',
    'Nhà sản xuất',
    'Đơn vị',
    'Số lượng đặt hàng dự kiến',
    'Số PO năm trước',
    'Ngày lên yêu cầu báo giá',
    'Quotation Closing Date',
    'Thời gian kết thúc',
  ];
  const blank = Array(18).fill('');
  const row = (no, name) => [
    no,
    'Chưa lựa chọn',
    'Buyer',
    'KH Smoke',
    'CS',
    'M',
    'SKU',
    'RQ',
    name,
    'MX',
    'Spec',
    'Maker',
    'cái',
    '1',
    '0',
    '2026-08-02',
    '2026-08-15',
    '17:00',
  ];
  const data = [
    blank,
    blank,
    blank,
    blank,
    header,
    blank,
    row('SMOKE-001', 'SP 1'),
    row('SMOKE-001', 'SP 1b'),
    row('SMOKE-002', 'SP 2'),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RFQ');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function main() {
  const parsed = parseRedecoRfqWorkbook(fixtureBuffer());
  assert.strictEqual(parsed.rows.length, 3);
  assert.ok(parsed.inBatchDuplicates.has('SMOKE-001'));
  const tagged = tagRowsForDuplicates(parsed.rows, parsed.inBatchDuplicates, new Set());
  assert.ok(tagged.filter((t) => t.tags.includes('trung')).length >= 2);

  const env = loadEnv(path.join(__dirname, '..', 'apps', 'api', '.env'));
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('PASS parse-only (no service role for DB smoke)');
    return;
  }

  const { createClient } = require('@supabase/supabase-js');
  const { Client } = require('pg');
  const pg = new Client({ connectionString: env.DIRECT_URL });
  await pg.connect();
  try {
    const tenant = await pg.query(`select id from public.tenants where slug = 'demo'`);
    if (!tenant.rows[0]) throw new Error('no demo tenant');
    const tenantId = tenant.rows[0].id;

    // Cleanup previous smoke
    await pg.query(
      `delete from public.customiz_rfq_requests where tenant_id = $1 and external_quote_no like 'SMOKE-%'`,
      [tenantId],
    );
    await pg.query(
      `delete from public.customiz_rfq_batches where tenant_id = $1 and file_name = 'smoke-redeco-rfq.xlsx'`,
      [tenantId],
    );

    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { data: batch, error: bErr } = await admin
      .from('customiz_rfq_batches')
      .insert({
        tenant_id: tenantId,
        pack_key: REDECO_RFQ_PACK_KEY,
        file_name: 'smoke-redeco-rfq.xlsx',
        row_total: 3,
        row_imported: 3,
        row_duplicate: 2,
        row_error: 0,
      })
      .select('id')
      .single();
    if (bErr) throw new Error(bErr.message);

    const rows = tagged.map((t) => ({
      tenant_id: tenantId,
      pack_key: REDECO_RFQ_PACK_KEY,
      batch_id: batch.id,
      external_quote_no: t.externalQuoteNo,
      tags: t.tags,
      attributes: t.attributes,
      source_row: t.sourceRow,
    }));
    const { error: iErr } = await admin.from('customiz_rfq_requests').insert(rows);
    if (iErr) throw new Error(iErr.message);

    const check = await pg.query(
      `select external_quote_no, tags from public.customiz_rfq_requests
       where tenant_id = $1 and external_quote_no like 'SMOKE-%' and deleted_at is null
       order by external_quote_no, source_row`,
      [tenantId],
    );
    assert.strictEqual(check.rows.length, 3);
    const dups = check.rows.filter((r) => (r.tags || []).includes('trung'));
    assert.ok(dups.length >= 2, 'expect duplicate tags');

    // Soft-delete then re-check: deleted should not block new quote uniqueness conceptually
    await pg.query(
      `update public.customiz_rfq_requests set deleted_at = now()
       where tenant_id = $1 and external_quote_no = 'SMOKE-002'`,
      [tenantId],
    );
    const live = await pg.query(
      `select count(*)::int as n from public.customiz_rfq_requests
       where tenant_id = $1 and pack_key = $2 and external_quote_no = 'SMOKE-002' and deleted_at is null`,
      [tenantId, REDECO_RFQ_PACK_KEY],
    );
    assert.strictEqual(live.rows[0].n, 0);

    console.log('PASS DB smoke import + soft-delete');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});
