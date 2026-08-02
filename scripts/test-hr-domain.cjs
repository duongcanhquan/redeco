/**
 * Smoke domain HR helpers.
 * node scripts/test-hr-domain.cjs  (sau build domain)
 */
const {
  isValidContractPeriod,
  canActivateContractForEmployee,
} = require('../packages/domain/dist/index.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isValidContractPeriod('2026-01-01', null), 'open-ended ok');
assert(isValidContractPeriod('2026-01-01', '2026-12-31'), 'range ok');
assert(!isValidContractPeriod('2026-06-01', '2026-01-01'), 'inverted bad');
assert(canActivateContractForEmployee('active'), 'active emp');
assert(!canActivateContractForEmployee('terminated'), 'terminated blocked');

console.log('PASS hr domain contract helpers');
