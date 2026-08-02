# AI Platform Ops + Multi-module Implementation Plan

> **For agentic workers:** Implement task-by-task. Spec: `docs/superpowers/specs/2026-08-02-ai-platform-ops-design.md`

**Goal:** Audit/usage + test connection + `/ai` hub + AI hỏi đáp Kho/SX/HR với entitlement + feature flags thật.

**Architecture:** Reuse `callTenantLlm` + `tenant_settings.ai`; add `ai_usage_logs`; extend catalog + services/UI mirrors Sales AI.

## Task 1: Migration usage logs + seed catalog

**Files:**
- Create `supabase/migrations/20260802260000_ai_platform_ops.sql`
- Update `scripts/seed-modules.cjs` (ai.kho / san-xuat / nhan-su trees)
- Update `scripts/entitle-demo-ai.cjs` if present

## Task 2: Domain settings + LLM logging + test connection

**Files:**
- `apps/web/src/services/tenant-settings.service.ts` — new feature flags
- `apps/web/src/services/ai-usage.service.ts` — log + rate limit from DB
- `apps/web/src/services/ai-llm.service.ts` — optional return meta
- `apps/web/src/lib/ai-access.ts` — new feature keys
- Settings actions: `testAiConnectionAction`

## Task 3: Module AI services (Kho/SX/HR)

**Files:**
- `apps/web/src/services/inventory-ai.service.ts`
- `apps/web/src/services/production-ai.service.ts`
- `apps/web/src/services/hr-ai.service.ts`
- Server actions under each hub

## Task 4: UI hub `/ai` + settings + panels

**Files:**
- `apps/web/src/app/app/ai/page.tsx` (+ layout)
- Update `ai-settings-form.tsx` — per-module toggles + test button
- Panels on inventory/production/hr hubs (reuse SalesAiPanel pattern)
- Nav: resolveAiTabs / sidebar

## Task 5: Verify

- Typecheck; apply migration; update `docs/current-state.md`
