# Implementation Plan — Sales Core Phase 2

> Spec: `docs/superpowers/specs/2026-08-02-sales-core-phase2-design.md`

## Files

| File | Responsibility |
|---|---|
| `supabase/migrations/20260802100000_sales_core_phase2.sql` | Tables + RLS + alter quotations/orders |
| `packages/domain/src/sales/types.ts` (+ new helpers) | Discount match, approval step filter, ATP/CTP types |
| `apps/web/src/services/sales.service.ts` | Extend mutations/queries |
| `apps/web/src/services/sales-config.service.ts` | Discount rules + approval workflows CRUD |
| `apps/web/src/app/app/sales/customers/[id]/page.tsx` | Customer timeline |
| `apps/web/src/app/app/sales/discount-rules/*` | UI rules |
| `apps/web/src/app/app/sales/approvals/*` | UI workflow |
| `apps/web/src/app/app/sales/quotations/*` | Multi-step actions |
| `apps/web/src/app/app/layout.tsx` | Menu links |
| `scripts/test-sales-core-phase2.cjs` | Smoke test |
| `docs/blueprints/2026-08-01-sales-module-blueprint.md` | Append Phase 2 |
| `docs/current-state.md` | Progress |

## Tasks

1. Migration + apply  
2. Domain helpers  
3. Config service (rules + workflows) + ensure default workflow  
4. Quotation submit/approve multi-step  
5. Customer timeline page  
6. Confirm SO → promise_check + outbox on ship/invoice  
7. UI pages + menu  
8. Smoke + verify docs  
