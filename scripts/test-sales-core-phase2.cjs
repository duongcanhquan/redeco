// Smoke test Sales Core Phase 2: discount rule match (domain), approval steps filter,
// promise check CTP stub — chạy thuần Node không cần server.
const assert = require('assert');

// Replicate domain helpers inline (CJS) — mirror packages/domain/src/sales/types.ts
function pickWinningDiscountRule(rules, input) {
  const matched = rules.filter((r) => {
    if (!r.isActive) return false;
    if (r.validFrom && input.onDate < r.validFrom) return false;
    if (r.validUntil && input.onDate > r.validUntil) return false;
    const c = r.conditions || {};
    if (c.customer_kinds?.length && !c.customer_kinds.includes(input.customerKind)) return false;
    if (c.customer_ids?.length && !c.customer_ids.includes(input.customerId)) return false;
    if (typeof c.min_doc_total === 'number' && input.docSubtotal < c.min_doc_total) return false;
    return true;
  });
  matched.sort((a, b) => a.priority - b.priority || b.discountPct - a.discountPct);
  return matched[0] || null;
}

function requiredApprovalSteps(steps, docTotal) {
  return steps
    .filter((s) => s.minAmount === 0 || docTotal >= s.minAmount)
    .sort((a, b) => a.stepOrder - b.stepOrder);
}

function buildPromiseCheck(lines) {
  const results = lines.map((l) => {
    const available = l.atpQty + l.openWoQty;
    const shortfall = Math.max(0, l.qty - available);
    if (shortfall <= 0) {
      return { ...l, shortfall: 0, ctpStatus: 'not_needed', earliestDate: null, reason: null };
    }
    return {
      ...l,
      shortfall,
      ctpStatus: 'unavailable',
      earliestDate: null,
      reason: 'Chưa kết nối module Sản xuất để tính CTP.',
    };
  });
  return { lines: results, allCovered: results.every((r) => r.shortfall <= 0) };
}

let pass = 0;
function ok(label) {
  console.log('PASS', label);
  pass++;
}

{
  const winner = pickWinningDiscountRule(
    [
      {
        id: 'a',
        priority: 10,
        isActive: true,
        validFrom: null,
        validUntil: null,
        discountPct: 5,
        conditions: { customer_kinds: ['b2b'], min_doc_total: 1_000_000 },
      },
      {
        id: 'b',
        priority: 1,
        isActive: true,
        validFrom: null,
        validUntil: null,
        discountPct: 8,
        conditions: { customer_kinds: ['b2b'] },
      },
    ],
    {
      customerId: 'c1',
      customerKind: 'b2b',
      docSubtotal: 2_000_000,
      productIds: [],
      onDate: '2026-08-02',
    },
  );
  assert.strictEqual(winner.id, 'b');
  ok('discount rule: priority thấp hơn thắng');
}

{
  const steps = requiredApprovalSteps(
    [
      { stepOrder: 1, name: 'Admin', minAmount: 0, assigneeRole: 'admin', assigneeUserId: null },
      { stepOrder: 2, name: 'Owner', minAmount: 50_000_000, assigneeRole: 'owner', assigneeUserId: null },
      { stepOrder: 3, name: 'Board', minAmount: 200_000_000, assigneeRole: 'owner', assigneeUserId: null },
    ],
    60_000_000,
  );
  assert.strictEqual(steps.length, 2);
  assert.strictEqual(steps[1].name, 'Owner');
  ok('approval: lọc bước theo ngưỡng tiền');
}

{
  const p = buildPromiseCheck([
    { productId: 'p1', qty: 10, atpQty: 10, openWoQty: 0 },
    { productId: 'p2', qty: 5, atpQty: 2, openWoQty: 0 },
  ]);
  assert.strictEqual(p.allCovered, false);
  assert.strictEqual(p.lines[1].ctpStatus, 'unavailable');
  ok('CTP stub khi thiếu ATP');
}

console.log(`\nKết quả: ${pass} pass`);
