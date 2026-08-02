/**
 * Test engine bộ lọc REDECO RFQ Phase 2.
 * Chạy: pnpm exec tsx scripts/test-redeco-rfq-filter.cjs
 */
const assert = require('assert');
const {
  classifyWithRules,
  mergeClassificationTags,
  evalCondition,
} = require('../apps/web/src/lib/customiz/redeco-rfq-filter.ts');

const row = {
  externalQuoteNo: 'BG-1',
  attributes: {
    end_customer: 'Khách A',
    qty_expected: '50',
    manufacturer: 'Hãng X',
  },
};

assert.strictEqual(
  evalCondition(row, { field: 'end_customer', op: 'contains', value: 'A' }),
  true,
);
assert.strictEqual(
  evalCondition(row, { field: 'qty_expected', op: 'gte', value: '50' }),
  true,
);
assert.strictEqual(
  evalCondition(row, { field: 'qty_expected', op: 'gt', value: '50' }),
  false,
);

const rules = [
  {
    id: '1',
    name: 'Không tiềm năng — SL thấp',
    enabled: true,
    priority: 10,
    logic: 'and',
    conditions: [{ field: 'qty_expected', op: 'lt', value: '20' }],
    thenTag: 'khong-tiem-nang',
  },
  {
    id: '2',
    name: 'Tiềm năng — KH A và SL >= 40',
    enabled: true,
    priority: 20,
    logic: 'and',
    conditions: [
      { field: 'end_customer', op: 'contains', value: 'Khách A' },
      { field: 'qty_expected', op: 'gte', value: '40' },
    ],
    thenTag: 'tiem-nang',
  },
  {
    id: '3',
    name: 'Cân nhắc mặc định hãng X',
    enabled: true,
    priority: 30,
    logic: 'and',
    conditions: [{ field: 'manufacturer', op: 'eq', value: 'Hãng X' }],
    thenTag: 'can-nhac',
  },
];

assert.strictEqual(classifyWithRules(row, rules), 'tiem-nang');

const low = {
  ...row,
  attributes: { ...row.attributes, qty_expected: '5' },
};
assert.strictEqual(classifyWithRules(low, rules), 'khong-tiem-nang');

const merged = mergeClassificationTags(['trung', 'tiem-nang'], 'can-nhac');
assert.deepStrictEqual(merged.sort(), ['can-nhac', 'trung'].sort());

console.log('PASS redeco-rfq-filter tests');
