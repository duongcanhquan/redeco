# Kinh doanh.REDECO Hub (H1–H3) Implementation Plan

> **For agentic workers:** Implement task-by-task. H4 (công thức thật) out of scope until user provides formulas — stub engine only.

**Goal:** Hub `kinh-doanh.redeco` với 4 tab; migrate catalog; sync BG Optimake từ tab 3.

**Architecture:** Approach 1 — shell hub + RFQ P1–P2 vào tab 1; profiles/calculations H2; bridge `quotations` H3.

**Tech Stack:** Next.js App Router, Supabase RLS, existing sales services.

**Spec:** `docs/superpowers/specs/2026-08-02-kinh-doanh-redeco-hub-design.md`

## Global Constraints

- Catalog key: `kinh-doanh.redeco`; alias tạm `customiz.kinh-doanh.redeco-rfq`
- Menu option B; không auto-hiện tab Báo giá
- Chuyển SX = hub_status only
- Strict TS, no `any`; services not in components
- UI: existing Sales tokens; responsive 3 breakpoints

---

## Task 1 — Catalog + pack key + menu

- [ ] Seed `kinh-doanh.redeco` in `scripts/seed-modules.cjs`
- [ ] Script/migration entitlement remap old → new
- [ ] `REDECO_PACK_KEY = 'kinh-doanh.redeco'`; alias accept both in access checks
- [ ] `workspace-nav.ts`: tab `kinh-doanh-redeco` → `/sales/redeco`; remove/replace `customiz-redeco-rfq` injection logic so only entitled sales children show

## Task 2 — Hub shell + redirect + tab 1

- [ ] Page `/app/sales/redeco/page.tsx` with 4 tabs
- [ ] Redirect `/sales/customiz/redeco-rfq` → `?tab=proposals`
- [ ] Move/reuse RFQ list, upload, filter, manual add into tab proposals
- [ ] «Đưa sang Tính» → `?tab=calc&requestId=`

## Task 3 — H2 migration + services

- [ ] Migration `redeco_quote_calc_profiles` + `redeco_quote_calculations` + RLS
- [ ] Services: profiles CRUD, run stub calc, list/update hub_status
- [ ] Tab settings / calc / done UI

## Task 4 — H3 sync quotations

- [ ] Ensure/create placeholder product + resolve/create customer
- [ ] Create/update quotation from calculation; hub editor syncs items
- [ ] Set `hub_status=quoted`

## Task 5 — Verify + docs

- [ ] typecheck/lint; update `docs/current-state.md`; entitle demo script
