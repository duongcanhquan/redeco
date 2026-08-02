# Inventory (Kho) Phase K1 — Implementation Plan

> **For agentic workers:** Use executing-plans / implement task-by-task.

**Goal:** Module Kho MVP — warehouse, tồn theo kho, phiếu nhập/xuất, ATP thật cho Sales; migrate tồn từ `product_stock`.

**Architecture:** Next.js services + Supabase RLS (`has_module_access('kho')`). K1 giữ `products` Sales làm danh mục bán; bảng `inventory_items` mirror `product_id` (fg). Tồn chuẩn ở `stock_balances`; sync `product_stock.qty_on_hand` = ATP kho TP khi post phiếu (tương thích Sales cũ).

**Tech Stack:** PostgreSQL/Supabase, TypeScript, Next App Router, `@optimake/domain`.

**Duyệt:** Người dùng chốt «làm theo thứ tự» (Kho → SX → KT) — 2026-08-02.

## Global Constraints

- Clean Architecture: UI → service → Supabase; không business logic trong component.
- RLS mọi bảng; cấm `any`.
- UI: glass/bento, responsive 3 thiết bị, ui-ux-pro-max tokens.

---

### Task 1: Migration + catalog `kho`

**Files:**
- Create: `supabase/migrations/20260802120000_inventory_module_k1.sql`
- Modify: `scripts/seed-modules.cjs`

- [ ] Bảng: `warehouses`, `inventory_items`, `stock_balances`, `stock_reservations`, `inventory_transactions`, `inventory_transaction_lines`
- [ ] RPC: `inventory_get_atp(product_id)`, `inventory_post_receipt`, `inventory_post_issue` (security invoker + tenant check)
- [ ] Backfill function: tạo KHO-TP/KHO-NVL + items từ products + balances từ product_stock
- [ ] Seed module key `kho` (+ children nhẹ)

### Task 2: Domain + service

**Files:**
- Create: `packages/domain/src/inventory/types.ts` (+ export)
- Create: `apps/web/src/services/inventory.service.ts`
- Modify: `sales.service.ts` confirm/ship dùng ATP/issue Kho khi entitled

### Task 3: UI workspace

**Files:**
- Create: `apps/web/src/app/app/inventory/**`
- Modify: `apps/web/src/app/app/layout.tsx` menu Kho

### Task 4: Demo entitle + verify

- Script/SQL gán `kho` cho hợp đồng demo
- `tsc` + eslint; smoke ATP
