# Accounting KT1 + Composable Capabilities — Implementation Plan

> **For agentic workers:** Implement tasks in order. ADR-011 + spec `docs/superpowers/specs/2026-08-02-composable-modules-kt1-design.md`.

**Goal:** Sổ công nợ AR từ `sales_outbox`; capability flags; COGS optional.

**Architecture:** Controller (Server Actions/pages) → `accounting.service.ts` → Supabase. Settings via `tenant-settings.service.ts`.

### Task 1: Migration
- File: `supabase/migrations/20260802150000_accounting_module_kt1.sql`
- Expand `tenant_settings` namespace `accounting`
- Tables `ar_invoices`, `cash_receipts`, `inventory_valuation_entries` + RLS `ke-toan`
- Outbox: SELECT/UPDATE `published_at` for `ke-toan` when consuming

### Task 2: Settings + domain
- `AccountingSettings` + get/save; forms + settings tab
- Optional thin helpers in `@optimake/domain` for AR status

### Task 3: Service
- `processPendingAccountingOutbox()` — fail-soft if !entitle || !ar_enabled
- `listArInvoices`, aging helpers
- COGS sync stub if `cogs_enabled` && kho

### Task 4: UI + wire
- `/app/accounting` hub; layout menu; call process on hub load + after invoice paid/create (optional)
- Entitle demo `ke-toan`

### Task 5: Docs + verify
- Update blueprint/roadmap/current-state; db push; typecheck
