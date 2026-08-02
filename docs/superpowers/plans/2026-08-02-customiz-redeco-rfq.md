# Customiz REDECO RFQ Phase 1 — Implementation Plan

> **For agentic workers:** Execute task-by-task; verify after each task.

**Goal:** Inbox yêu cầu báo giá từ Excel (`.xls`/`.xlsx`) cho gói `customiz.kinh-doanh.redeco-rfq` — import, tag trùng, list/detail, soft-delete.

**Architecture:** Parser thuần (xlsx) → service Supabase + RLS → UI dưới Kinh doanh. Catalog entitlement riêng; không đụng quotation core.

**Tech Stack:** PostgreSQL/Supabase, Next.js App Router, `xlsx`, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-08-02-customiz-redeco-rfq-design.md`  
**Sample:** `TÀI LIỆU/REDECO_Infor báo giá.1.xls` (header R5; data từ R6 — file mẫu hiện trống data).

## Global Constraints

- UI → service → Supabase; cấm `any`.
- RLS + `tenant_id`; soft-delete không tham gia check trùng.
- Hỗ trợ `.xls` và `.xlsx`.
- Menu: **Yêu cầu BG · REDECO** khi có entitlement pack.

---

### Task 1: Migration + catalog

- [ ] `supabase/migrations/20260802180000_customiz_redeco_rfq.sql`
- [ ] Seed `customiz` / `customiz.kinh-doanh` / `customiz.kinh-doanh.redeco-rfq`
- [ ] `scripts/entitle-demo-customiz-redeco-rfq.cjs`
- [ ] Apply migration + seed + entitle

### Task 2: Parser + tests

- [ ] `apps/web/src/lib/customiz/redeco-rfq-parse.ts`
- [ ] Fixture + `scripts/test-redeco-rfq-parse.cjs` (header, empty skip, duplicate in-batch)

### Task 3: Service + server actions

- [ ] `apps/web/src/services/customiz/redeco-rfq.service.ts`
- [ ] Upload / list / get / soft-delete actions

### Task 4: UI + nav

- [ ] Tab Kinh doanh + pages list/detail/upload
- [ ] Responsive; tags trùng rõ

### Task 5: Verify

- [ ] `tsc --noEmit`; smoke import fixture; cập nhật `docs/current-state.md`
