# Sales Setup Hub Implementation Plan

> **For agentic workers:** Implement theo task; verify typecheck cuối.

**Goal:** Icon menu + hub Cài đặt→Kinh doanh (panels, checklist, presets/profiles).

**Spec:** `docs/superpowers/specs/2026-08-02-sales-setup-hub-design.md`

## Tasks

1. Icon map dùng chung → sidebar + chỉnh HubTabBar (`Receipt` HĐ, `ClipboardList` ĐH).
2. `lib/sales-setup.ts` — presets, checklist, warnings (pure).
3. Service: setup flags, profiles CRUD, apply preset/profile, sync inventory flags.
4. Actions + UI hub đa panel thay `sales-settings-form`.
5. Settings page: `panel` searchParam, load inventory + counts workflow/rules.
6. Typecheck; cập nhật `docs/current-state.md`.
