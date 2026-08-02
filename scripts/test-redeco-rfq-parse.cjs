/**
 * Test parser Customiz REDECO RFQ.
 * Chạy: pnpm exec tsx scripts/test-redeco-rfq-parse.cjs
 * hoặc: node --import tsx scripts/test-redeco-rfq-parse.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const XLSX = require('../apps/web/node_modules/xlsx');
const {
  parseRedecoRfqWorkbook,
  tagRowsForDuplicates,
} = require('../apps/web/src/lib/customiz/redeco-rfq-parse.ts');

function buildFixtureBuffer() {
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
  const rowA = [
    'BG-001',
    'Chưa lựa chọn',
    'Nguyen A',
    'KH A',
    'CS1',
    'M1',
    'SKU1',
    'RQ1',
    'San pham 1',
    'ModelX',
    'Spec',
    'Maker',
    'cái',
    '10',
    '5',
    '2026-08-01',
    '2026-08-10',
    '17:00',
  ];
  const rowDup = [...rowA];
  rowDup[8] = 'San pham 1b';
  const rowB = [...rowA];
  rowB[0] = 'BG-002';
  rowB[8] = 'San pham 2';
  const rowBad = [...rowA];
  rowBad[0] = '';
  rowBad[8] = 'No quote no';

  const data = [blank, blank, blank, blank, header, blank, rowA, rowDup, rowB, rowBad];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RFQ');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function main() {
  const parsed = parseRedecoRfqWorkbook(buildFixtureBuffer());
  assert.strictEqual(parsed.rows.length, 3, '3 valid rows');
  assert.strictEqual(parsed.errors.length, 1, '1 missing A');
  assert.ok(parsed.inBatchDuplicates.has('BG-001'), 'in-batch dup');

  const tagged = tagRowsForDuplicates(
    parsed.rows,
    parsed.inBatchDuplicates,
    new Set(['BG-002']),
  );
  assert.ok(
    tagged.find((t) => t.externalQuoteNo === 'BG-001').tags.includes('trung'),
    'BG-001 trung',
  );
  assert.ok(
    tagged.find((t) => t.externalQuoteNo === 'BG-002').tags.includes('trung'),
    'BG-002 trung vs DB',
  );

  const root = path.join(__dirname, '..');
  const dir = fs.readdirSync(root).find((n) => n.startsWith('TÀI') || n.startsWith('TAI'));
  if (dir) {
    const sample = fs
      .readdirSync(path.join(root, dir))
      .find((n) => n.includes('REDECO_Infor'));
    if (sample) {
      const sampleParsed = parseRedecoRfqWorkbook(
        fs.readFileSync(path.join(root, dir, sample)),
      );
      assert.ok(
        !sampleParsed.errors.some((e) => e.sourceRow === 5),
        'sample header ok',
      );
      assert.strictEqual(sampleParsed.rows.length, 0, 'sample header-only');
      console.log('PASS sample header-only');
    }
  }

  console.log('PASS all redeco-rfq parse tests');
}

main();
