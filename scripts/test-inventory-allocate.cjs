/**
 * Unit: allocate FIFO/FEFO/LIFO
 * Chạy: pnpm exec tsx scripts/test-inventory-allocate.cjs
 */
const assert = require('assert');
const {
  allocatePickQty,
  sortQuantsForStrategy,
} = require('../packages/domain/src/inventory/allocate.ts');

const quants = [
  {
    locationId: 'L1',
    lotId: 'A',
    qty: 5,
    receivedAt: '2026-01-01T00:00:00Z',
    expiryDate: '2026-12-01',
  },
  {
    locationId: 'L2',
    lotId: 'B',
    qty: 10,
    receivedAt: '2026-02-01T00:00:00Z',
    expiryDate: '2026-06-01',
  },
];

const fifo = allocatePickQty(quants, 7, 'fifo');
assert.ok(fifo);
assert.strictEqual(fifo.length, 2);
assert.strictEqual(fifo[0].lotId, 'A');
assert.strictEqual(fifo[0].qty, 5);
assert.strictEqual(fifo[1].lotId, 'B');
assert.strictEqual(fifo[1].qty, 2);

const fefo = allocatePickQty(quants, 7, 'fefo');
assert.ok(fefo);
assert.strictEqual(fefo[0].lotId, 'B'); // expires sooner
assert.strictEqual(fefo[0].qty, 7);

const short = allocatePickQty(quants, 100, 'fifo');
assert.strictEqual(short, null);

const lifoOrder = sortQuantsForStrategy(quants, 'lifo');
assert.strictEqual(lifoOrder[0].lotId, 'B');

console.log('PASS inventory allocate FIFO/FEFO/LIFO');
