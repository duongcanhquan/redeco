# Current State — Bộ nhớ cốt lõi của dự án

> **Quy tắc cho AI Agent**: Đọc tệp này ĐẦU TIÊN ở mỗi phiên làm việc mới. Sau khi hoàn thành mỗi tính năng/module, PHẢI tự động cập nhật tệp này (xem `.cursor/rules/context-tracking.mdc`).

**Dự án**: Multi-tenant SaaS ERP/MES
**Tech stack**: TypeScript · Next.js 16 (App Router, Turbopack) · NestJS 11 · Supabase (PostgreSQL + RLS) · Cloudflare R2 · pnpm monorepo
**Cập nhật lần cuối**: 2026-08-01

---

## 0. Quy trình làm việc bắt buộc (chốt bởi người dùng)

- **Database**: Supabase (PostgreSQL + RLS). **Storage**: Cloudflare R2. **Backend**: NestJS (ADR-007).
- **Quy trình lập trình**: bám chặt skill Superpowers `using-superpowers` — kiểm tra & invoke skill TRƯỚC mọi hành động (xem `.cursor/rules/skills-workflow.mdc`, ADR-005).
- **Thiết kế UI/UX**: mọi task UI phải invoke skill `ui-ux-pro-max`; **luôn responsive đủ Desktop / iPad / Phone**; hiển thị rõ ràng, minh bạch, cực đẹp (xem `.cursor/rules/ui-design.mdc`, ADR-006).

---

## 1. Các module đã hoàn thành

### ✅ Project Foundation — Rules & Context Tracking (2026-08-01)

- `.cursor/rules/`: `general.mdc` (Clean Architecture/SOLID/DDD, phân lớp, strict TS), `database.mdc` (RLS + JSONB, cấm EAV), `frontend-metadata.mdc` (Metadata-Driven UI từ R2), `ddd-blueprint.mdc` (Blueprint bắt buộc trước module mới), `context-tracking.mdc`, `skills-workflow.mdc` (Superpowers), `ui-design.mdc` (ui-ux-pro-max + responsive 3 thiết bị).
- `docs/`: `architecture-decisions.md` (ADR-001..007), `current-state.md`.

### ✅ Supabase Migration Tooling + Migration 0001 (2026-08-01) — ĐÃ APPLY

- Supabase CLI 2.111.0 cài làm devDep root (`pnpm exec supabase ...`); `supabase/` đã init (`config.toml`, `migrations/`).
- `supabase/migrations/20260801073000_multi_tenant_foundation.sql`:
  - `public.current_tenant_id()` — helper đọc `app_metadata.tenant_id` từ JWT, dùng trong MỌI RLS policy.
  - `public.tenants` (id, name, slug, status, attributes JSONB) — RLS: user chỉ SELECT tenant của mình; ghi qua service role.
  - `public.user_profiles` (id = auth.users.id, tenant_id, role owner/admin/member, attributes JSONB) — RLS: SELECT cùng tenant, UPDATE chỉ bản thân; INSERT/DELETE qua service role khi onboarding.
  - Trigger `set_updated_at`, index `(tenant_id)` + GIN cho attributes.
- **Quy ước chốt**: `tenant_id` lưu ở `auth.users.raw_app_meta_data` → tự vào JWT `app_metadata` (client không sửa được). `database.mdc` đã cập nhật policy mẫu theo helper này.
- `.env.example` (root) + `apps/api/.env` (gitignored, ĐÃ điền đầy đủ password + toàn bộ keys) — project `unekhffoqackhzczaasy` (ap-south-1). Lưu ý: password chứa `@` nên trong connection string phải encode `%40`.
- **Trạng thái apply**: schema đã có trên remote (người dùng chạy SQL thủ công qua Dashboard SQL Editor); đã xác minh khớp 100% với migration file (2 bảng + 3 policies + 2 functions, RLS bật); đã `supabase migration repair --status applied 20260801073000` → migration history local/remote đồng bộ.
- Quy trình migration sau này: viết file vào `supabase/migrations/` → `pnpm exec supabase db push --db-url $DIRECT_URL` (KHÔNG chạy SQL thủ công trên dashboard nữa để history không lệch).
- Tool hỗ trợ: `scripts/inspect-db.cjs` (node, dùng devDep `pg`) — in ra tables/columns/policies/functions/migration history của remote DB.

### ✅ Monorepo Scaffold (2026-08-01)

Cấu trúc đã dựng và xác minh (typecheck ✓, build ✓, lint ✓, runtime link ✓):

```
package.json               # root: pnpm workspaces, scripts dev/build/lint/typecheck/format
pnpm-workspace.yaml        # apps/* + packages/*
tsconfig.base.json         # strict: true, noUncheckedIndexedAccess, noImplicitOverride...
.prettierrc / .gitignore / README.md
apps/
  web/                     # @redeco/web — Next.js 16.2.12 App Router + Tailwind v4 + Turbopack, src-dir, alias @/*
  api/                     # @redeco/api — NestJS 11, strict TS, global prefix /api, port 3001
packages/
  domain/                  # @redeco/domain — build ra dist (CJS + d.ts) qua hook prepare
    src/shared/branded-types.ts   # Brand<T>, TenantId, UserId + asTenantId/asUserId
    src/shared/base-entity.ts     # BaseEntityProps (id, tenantId, attributes JSONB, timestamps)
    src/shared/domain-event.ts    # DomainEvent<TPayload>
```

Ghi chú kỹ thuật quan trọng:
- `@redeco/domain` được cả web và api dùng qua `workspace:*`; consume từ `dist/` (không import TS source) để tương thích cả Nest (tsc) lẫn Next (bundler). Hook `prepare` tự build khi `pnpm install`.
- Ports: web = 3000, api = 3001 (prefix `/api`).
- Môi trường máy dev: Node v24, pnpm 10.18.3, Python 3.12 (cần cho script ui-ux-pro-max).
- pnpm cảnh báo "Ignored build scripts: sharp, unrs-resolver" — nếu cần dùng sharp (image optimization) sau này, chạy `pnpm approve-builds`.

---

## 2. Ngữ cảnh hiện tại

- Monorepo build sạch; đã push lên GitHub `duongcanhquan/redeco` (main). Repo đang **PUBLIC** — đã khuyến nghị chuyển private, chờ người dùng quyết.
- Supabase: migration 0001 ĐÃ áp dụng, history đồng bộ. Credentials đầy đủ trong `apps/api/.env`.
- Người dùng đang deploy `apps/web` lên Vercel — gặp lỗi "No Output Directory named public" do Root Directory chưa trỏ `apps/web`; đã hướng dẫn sửa trên dashboard, chưa xác nhận kết quả.
- Chưa cấu hình R2 bucket.
- Chưa chạy script sinh Design System của ui-ux-pro-max (`design-system/MASTER.md` chưa tồn tại) — bắt buộc chạy khi bắt đầu task UI đầu tiên.

---

## 3. Các bước tiếp theo (Next actions)

1. **Tenant context ở api**: NestJS Guard verify JWT Supabase (JWKS URL đã có trong .env), extract `tenant_id` từ `app_metadata`, injection cho Repository layer; seed tenant đầu tiên + user test.
3. **Sinh Design System** cho REDECO bằng script ui-ux-pro-max (`--design-system --persist -p "REDECO"`) → tạo `design-system/MASTER.md`.
4. **Xây Metadata Engine phía frontend**: zod schema cho UI metadata, Component Registry, FormRenderer/GridRenderer (tuân `ui-design.mdc` — responsive 3 thiết bị).
5. **Cấu hình R2**: bucket + service backend đọc/ghi metadata JSON theo key convention `tenants/{tenant_id}/metadata/...`.
6. **Module nghiệp vụ đầu tiên** (ví dụ WorkOrder): bắt đầu bằng Aggregate Design Blueprint theo `ddd-blueprint.mdc`.

---

## 4. Nhật ký phiên làm việc

| Ngày | Việc đã làm |
|---|---|
| 2026-08-01 | Khởi tạo 5 Cursor Rules + hệ thống Context Tracking (ADR, current-state) |
| 2026-08-01 | Bổ sung `skills-workflow.mdc` (Superpowers) + `ui-design.mdc` (ui-ux-pro-max, responsive 3 thiết bị); ghi ADR-005, ADR-006 |
| 2026-08-01 | Chốt NestJS (ADR-007); scaffold pnpm monorepo: @redeco/web (Next 16), @redeco/api (Nest 11), @redeco/domain; typecheck/build/lint đều pass |
| 2026-08-01 | Commit đầu tiên + push lên GitHub duongcanhquan/redeco (merge với README khởi tạo trên remote) |
| 2026-08-01 | Supabase CLI + supabase init; viết migration 0001 (tenants, user_profiles, RLS, current_tenant_id); tạo .env.example + apps/api/.env — chờ password để apply |
| 2026-08-01 | Điền đủ credentials (.env); xác minh schema remote khớp migration (user đã chạy SQL thủ công); migration repair → history đồng bộ; thêm scripts/inspect-db.cjs |
