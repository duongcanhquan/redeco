# REDECO — Multi-tenant SaaS ERP/MES

Hệ thống ERP/MES đa tenant, xây dựng theo Clean Architecture + Domain-Driven Design.

## Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js (App Router) + TypeScript — Metadata-Driven Rendering Engine |
| Backend | NestJS + TypeScript — Controller → Service → Repository → Entity |
| Database | Supabase (PostgreSQL + Row Level Security cho multi-tenancy) |
| Storage | Cloudflare R2 (UI metadata JSON, file uploads) |
| Monorepo | pnpm workspaces |

## Cấu trúc

```
apps/
  web/        # Next.js App Router (Rendering Engine)
  api/        # NestJS backend
packages/
  domain/     # Shared domain entities, types, events (@redeco/domain)
docs/
  architecture-decisions.md   # ADR — lý do các quyết định kiến trúc
  current-state.md            # Trạng thái & tiến độ dự án (đọc đầu tiên!)
  blueprints/                 # Aggregate Design Blueprints
.cursor/rules/                # Cursor Rules (quy tắc bắt buộc cho AI Agent)
```

## Bắt đầu

```bash
# Cài dependencies (yêu cầu Node >= 20, pnpm)
pnpm install

# Chạy dev cả web + api
pnpm dev

# Hoặc riêng lẻ
pnpm dev:web   # Next.js — http://localhost:3000
pnpm dev:api   # NestJS  — http://localhost:3001

# Kiểm tra chất lượng
pnpm typecheck
pnpm lint
pnpm build
```

## Quy tắc phát triển

- Đọc `docs/current-state.md` đầu mỗi phiên làm việc.
- Module mới phải có Aggregate Design Blueprint được duyệt trước (xem `.cursor/rules/ddd-blueprint.mdc`).
- Mọi bảng DB phải có `tenant_id` + RLS policy (xem `.cursor/rules/database.mdc`).
- UI phải responsive đủ Desktop / iPad / Phone và pass checklist trong `.cursor/rules/ui-design.mdc`.
