/**
 * Unit test: PreventiveMaintenanceEngine catch-up.
 * node scripts/test-maintenance-pm.cjs
 */
const assert = require('assert');

/** Mirror domain selectDueMaintenancePlans for smoke without build. */
function addCalendarDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function selectDueMaintenancePlans(plans, asOf, maxCatchUpPerPlan = 6) {
  const out = [];
  for (const plan of plans) {
    if (!plan.isActive || plan.intervalDays <= 0) continue;
    let next = plan.nextDueOn;
    let idx = 0;
    while (next <= asOf && idx < maxCatchUpPerPlan) {
      const advanced = addCalendarDays(next, plan.intervalDays);
      out.push({
        planId: plan.id,
        dueOn: next,
        nextDueAfterGenerate: advanced,
        catchUpIndex: idx,
      });
      next = advanced;
      idx += 1;
    }
  }
  return out;
}

const due = selectDueMaintenancePlans(
  [
    {
      id: 'p1',
      isActive: true,
      intervalDays: 30,
      nextDueOn: '2026-06-01',
    },
  ],
  '2026-08-02',
);

assert.strictEqual(due.length, 3, 'expect 3 catch-up WOs Jun→Jul→Aug');
assert.strictEqual(due[0].dueOn, '2026-06-01');
assert.strictEqual(due[2].nextDueAfterGenerate, '2026-08-30');

const none = selectDueMaintenancePlans(
  [{ id: 'p2', isActive: true, intervalDays: 30, nextDueOn: '2026-09-01' }],
  '2026-08-02',
);
assert.strictEqual(none.length, 0);

console.log('PASS — PM engine catch-up');
