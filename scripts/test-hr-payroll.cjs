const {
  countLeaveDays,
  rangesOverlap,
  computeOtAmount,
  computeNetPay,
} = require('../packages/domain/dist/index.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(countLeaveDays('2026-08-01', '2026-08-01') === 1, '1 day');
assert(countLeaveDays('2026-08-01', '2026-08-03') === 3, '3 days');
assert(rangesOverlap('2026-08-01', '2026-08-05', '2026-08-05', '2026-08-07'), 'touch');
assert(!rangesOverlap('2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'), 'gap');
assert(computeOtAmount(120, 50000) === 100000, '2h OT');
assert(computeNetPay(10_000_000, 100_000, 50_000) === 10_050_000, 'net');

console.log('PASS hr leave/payroll helpers');
