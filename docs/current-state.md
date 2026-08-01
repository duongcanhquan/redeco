# Current State — Bộ nhớ cốt lõi của dự án

> **Quy tắc cho AI Agent**: Đọc tệp này ĐẦU TIÊN ở mỗi phiên làm việc mới. Sau khi hoàn thành mỗi tính năng/module, PHẢI tự động cập nhật tệp này (xem `.cursor/rules/context-tracking.mdc`).

**Dự án**: Optimake — Multi-tenant SaaS ERP/MES (rebrand từ REDECO, 2026-08-01)
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

### ✅ Platform Core — DB & Domain (2026-08-01) — ĐÃ APPLY

Spec đã duyệt: `docs/specs/2026-08-01-platform-core-design.md` (kèm ADR-008). Các quyết định người dùng chốt: subdomain ngay từ đầu; superadmin console cùng app tại `/platform`; 1 email = 1 công ty; nhắc hạn dashboard + email 30/14/7; module nghiệp vụ đầu tiên = Kinh doanh; **danh mục module dạng CÂY** (module → module con → tính năng, cấp node = được cả subtree).

- Migration `20260801140000_platform_core.sql` (đã apply, history đồng bộ):
  - `platform_admins`, `modules` (cây tự tham chiếu, key dotted-path unique), `contracts` (thời hạn/seats/status), `contract_entitlements` (subtree), `user_module_assignments` (access_level view/edit/manage), `platform_settings` (đã seed `contract_reminder_days = [30,14,7]`).
  - Functions: `is_platform_admin()`, `tenant_entitled_module_ids(tenant)`, `my_module_ids()` — một nguồn sự thật cho RLS + API + UI menu.
  - RLS đầy đủ 8/8 bảng, 15 policies (đã verify bằng `scripts/inspect-db.cjs`).
- Seed catalog: `scripts/seed-modules.cjs` (idempotent) — 13 node: 6 module gốc (kinh-doanh, san-xuat, ke-toan, nhan-su, hanh-chinh, thiet-bi) + cây Kinh doanh 3 tầng (khach-hang, bao-gia, don-hang + 4 features).
- `@optimake/domain` mới: `ModuleNode`, `ModuleId`, `AccessLevel`, `Contract`, `ContractStatus`, `contractHealth()` (active/expiring_soon/expired), `TenantRole`, `isTenantAdmin()`.

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

### ✅ Auth + Login + Superadmin Console UI (2026-08-01)

- **Design System đã sinh & persist**: `design-system/optimake/MASTER.md` (ui-ux-pro-max). Palette chốt: nền navy `#1f293a` (`--color-app`), accent cyan `#00eeff` (`--color-accent`), kính mờ (`.glass`) + bento grid. Font: **Be Vietnam Pro** (Poppins không có glyph tiếng Việt). Tokens semantic khai báo trong `apps/web/src/app/globals.css` qua `@theme` — cấm hex thô trong component.
- **Superadmin**: `scripts/create-superadmin.cjs` (idempotent) — đã tạo `superadmin@gmail.com` / `123456` (user id `a43744b6-...`), `app_metadata.is_platform_admin=true` + row trong `platform_admins`.
- **Supabase phía web**: `@supabase/supabase-js` + `@supabase/ssr`; helpers `src/lib/supabase/client.ts` (browser) & `server.ts` (RSC); `apps/web/.env.local` (gitignored) chứa URL + anon key.
- **Route protection**: `src/proxy.ts` (Next 16 đổi tên middleware→proxy) — refresh session + chặn `/platform`: chưa login → `/login?next=...`, login nhưng không phải platform admin → `/login?error=forbidden`.
- **`/login`**: đúng mẫu form animated đã duyệt (vòng 50 span neon xoay + floating label, cyan `#0ef`), tiếng Việt, responsive (scale ở <420px), `prefers-reduced-motion`, focus-visible, thông báo lỗi rõ. Sau login: platform admin → `/platform`; user thường → thông báo workspace công ty đang xây.
- **Console `/platform`** (glassmorphism + bento, icon lucide-react, sidebar desktop / nav ngang mobile):
  - Tổng quan: 4 stat cards (công ty, HĐ hiệu lực, sắp hết hạn ≤30 ngày, tổng seats) + HĐ gần đây + tóm tắt catalog.
  - `companies`, `contracts` (bảng + empty state; nút Tạo đang disabled chờ Platform API), `modules` (render cây 3 tầng), `settings` (JSON viewer), `account` (đổi mật khẩu qua `auth.updateUser` + signout).
  - Data đọc trực tiếp qua RLS (JWT có `is_platform_admin`) — mọi query nằm ở `src/services/platform.service.ts`, KHÔNG trong component.
- **Đã verify**: typecheck ✓ lint ✓ build ✓; smoke test: `/login` 200, `/platform` 307→login khi chưa đăng nhập, login API superadmin trả claim đúng.

### ✅ Superadmin Mutations — Tạo công ty / Hợp đồng (2026-08-01) — ADR-009

- **Migration 0003** (`20260801150000_platform_admin_tenant_access.sql`, ĐÃ apply): policy `tenants_platform_all` + `user_profiles_platform_all` — sửa lỗ hổng superadmin không đọc được danh sách công ty (migration 0001 chỉ cho user xem tenant mình).
- **Server Actions + service role** (ADR-009): `lib/supabase/admin.ts` (client service role, import `server-only`), `services/platform-admin.service.ts`:
  - `createCompanyWithAdmin()`: tạo tenant → tạo auth user admin (app_metadata.tenant_id, email confirmed) → user_profiles role `owner`; rollback ngược nếu bước sau fail; bắt lỗi trùng slug/email thân thiện.
  - `createContract()`: hợp đồng + entitlements (chọn node cây = subtree), option kích hoạt ngay/nháp; `setContractStatus()` (active/suspended/terminated).
  - Mọi hàm gọi `assertPlatformAdmin()` kiểm tra JWT server-side trước.
- **UI console**: modal glass dùng chung (`components/platform/modal.tsx`); dialog Tạo công ty (auto-slug từ tên có bỏ dấu, sinh mật khẩu ngẫu nhiên, panel hiển thị credentials 1 lần + copy); dialog Lập hợp đồng (chọn công ty, thời hạn mặc định 1 năm, seats, cây module checkbox — chọn cha tự cover con); nút đổi trạng thái HĐ ngay trên bảng (kích hoạt/tạm dừng/chấm dứt + confirm).
- **Env mới cho web**: `SUPABASE_SERVICE_ROLE_KEY` trong `apps/web/.env.local` — **Vercel cũng phải thêm biến này** (server-only).
- **Đã verify**: build/lint/typecheck sạch; smoke test DB end-to-end (`scripts/test-platform-flow.cjs`, tự dọn dữ liệu): tạo tenant → user → profile → contract → entitlement kinh-doanh cho đúng 8 node subtree, tạm dừng HĐ → quyền về 0. PASS toàn bộ.

### ✅ Superadmin Console hoàn thiện (2026-08-01)

- **Công ty**: bảng thêm cột email admin (lưu trong `tenants.attributes.admin_email` khi tạo) + số thành viên (nested count); actions từng dòng: Tạm dừng/Kích hoạt công ty, **Reset mật khẩu admin** (sinh ngẫu nhiên, hiện 1 lần + copy, tìm owner qua `user_profiles.role='owner'`).
- **Hợp đồng**: cột Module hiển thị badge các node đã bán (nested `contract_entitlements(modules(name))`); nút **Gia hạn** (đổi ends_on + seats, modal).
- **Danh mục module**: trang chuyển thành trình quản lý tương tác (`modules-manager.tsx`) — thêm module gốc, thêm node con (key tự sinh dotted-path từ key cha + slug tên), sửa tên/mô tả, bật/tắt node (confirm khi tắt; node tắt hiện badge "đã tắt" + mờ). Icon actions hiện khi hover (group-hover + focus-within).
- **Tham số**: `setting-editor.tsx` — sửa giá trị JSON inline có validate JSON.parse trước khi gửi.
- Service mở rộng: `setTenantStatus`, `resetCompanyAdminPassword`, `extendContract`, `createModuleNode`, `updateModuleNode`, `setModuleActive`, `updatePlatformSetting` — tất cả qua `assertPlatformAdmin()`.
- Đã verify: build/lint/typecheck sạch; truy vấn lồng PostgREST test OK (`scripts/test-nested-queries.cjs`).

### ✅ Module Kinh doanh — Phase 1 Order-to-Cash (2026-08-01)

Blueprint: `docs/blueprints/2026-08-01-sales-module-blueprint.md` (aggregates + invariants + roadmap nhóm 2–5).

- **Migration 0004** (`20260801170000_sales_module_core.sql`, ĐÃ apply): `products` + `product_stock` (check `qty_on_hand >= 0`), `customers` (kind b2b/b2c/dai-ly, credit_limit null = không giới hạn), `quotations` + `quotation_items`, `sales_orders` + `sales_order_items` (snapshot `credit_check` jsonb + `atp_qty`), `delivery_notes`, `invoices`. RLS 9/9 bảng = `tenant_id = current_tenant_id()` AND `has_module_access('kinh-doanh')` (helper mới dựa `my_module_ids()` → tự chặn khi hợp đồng hết hiệu lực). Function `decrement_stock(product, qty)` trừ tồn nguyên tử chống âm kho (security invoker).
- **Domain** (`@optimake/domain/sales`): `computeLineTotal`, `computeDocTotal`, `checkCredit`, `QUOTATION_TRANSITIONS`/`canTransitionQuotation`, các union types trạng thái.
- **Tenant workspace `/app`**: proxy guard (user có `tenant_id` → `/app`, redirect từ `/`+`/login`); layout sidebar hiện tên công ty + menu theo `my_module_ids()` (module chưa có UI hiện "sắp ra mắt"); dashboard 4 stat (khách hàng, báo giá chờ, đơn đang chạy, công nợ phải thu); `/app/account` đổi mật khẩu + signout.
- **Service** `src/services/sales.service.ts` — chạy dưới JWT user (KHÔNG service role, RLS cô lập tenant): CRUD khách hàng/sản phẩm; báo giá (items, chiết khấu dòng + tổng, flow draft→sent→approved/rejected→converted, duyệt chỉ owner/admin); đơn hàng (tạo mới/convert từ báo giá; **confirm = credit check bắt buộc** [công nợ unpaid + đơn ≤ hạn mức, chặn nếu vượt] + **ATP snapshot** từng dòng [thiếu vẫn cho xác nhận — giao sau, CTP chờ module Sản xuất]); giao hàng (ship = `decrement_stock` từng dòng, rollback nếu thiếu, SO → completed); hóa đơn (sinh từ đơn đã giao, unpaid = công nợ, nút thu tiền). Mã chứng từ auto: KH-/SP-/BG-/DH-/GH-/HD-XXXX.
- **UI** 6 trang dưới `/app/sales/` (glass + bento, bảng responsive, badge trạng thái, items editor dùng chung `components/sales/items-editor.tsx` tự điền giá chuẩn): customers, products (kèm tồn kho ATP), quotations, orders (modal kết quả credit + ATP sau xác nhận), deliveries, invoices.
- **Đã verify**: typecheck/lint/build sạch; smoke test `scripts/test-sales-flow.cjs` (9 bước, chạy dưới JWT user thật, tự dọn): toàn luồng O2C + guard chống âm kho + RLS chặn khi hợp đồng suspended — PASS.
- **Demo**: `scripts/seed-demo-company.cjs` — công ty "demo", login `demo@optimake.com` / `Demo@123`, 3 khách hàng + 4 sản phẩm có tồn.
- **Roadmap nhóm 2–5** (trong blueprint): CPQ+BOM động, Dynamic Pricing, AI Forecasting, B2B Portal+EDI (nhóm 2 — cần module Kho/Kỹ thuật/Sản xuất); Churn/NBA/Copilot (nhóm 3 — cần dữ liệu lịch sử, schema đã chuẩn bị timestamps + attributes); n8n webhook theo domain events (nhóm 4); chuyên biệt từng DN (nhóm 5 — sau).

### ✅ Monorepo Scaffold (2026-08-01)

Cấu trúc đã dựng và xác minh (typecheck ✓, build ✓, lint ✓, runtime link ✓):

```
package.json               # root: pnpm workspaces, scripts dev/build/lint/typecheck/format
pnpm-workspace.yaml        # apps/* + packages/*
tsconfig.base.json         # strict: true, noUncheckedIndexedAccess, noImplicitOverride...
.prettierrc / .gitignore / README.md
apps/
  web/                     # @optimake/web — Next.js 16.2.12 App Router + Tailwind v4 + Turbopack, src-dir, alias @/*
  api/                     # @optimake/api — NestJS 11, strict TS, global prefix /api, port 3001
packages/
  domain/                  # @optimake/domain — build ra dist (CJS + d.ts) qua hook prepare
    src/shared/branded-types.ts   # Brand<T>, TenantId, UserId + asTenantId/asUserId
    src/shared/base-entity.ts     # BaseEntityProps (id, tenantId, attributes JSONB, timestamps)
    src/shared/domain-event.ts    # DomainEvent<TPayload>
```

Ghi chú kỹ thuật quan trọng:
- `@optimake/domain` được cả web và api dùng qua `workspace:*`; consume từ `dist/` (không import TS source) để tương thích cả Nest (tsc) lẫn Next (bundler). Hook `prepare` tự build khi `pnpm install`.
- Ports: web = 3000, api = 3001 (prefix `/api`).
- Môi trường máy dev: Node v24, pnpm 10.18.3, Python 3.12 (cần cho script ui-ux-pro-max).
- pnpm cảnh báo "Ignored build scripts: sharp, unrs-resolver" — nếu cần dùng sharp (image optimization) sau này, chạy `pnpm approve-builds`.

---

## 2. Ngữ cảnh hiện tại

- Monorepo build sạch; đã push lên GitHub `duongcanhquan/redeco` (main). Repo đang **PUBLIC** — đã khuyến nghị chuyển private, chờ người dùng quyết.
- Supabase: migration 0001 ĐÃ áp dụng, history đồng bộ. Credentials đầy đủ trong `apps/api/.env`.
- Người dùng đang deploy `apps/web` lên Vercel — gặp lỗi "No Output Directory named public" do Root Directory chưa trỏ `apps/web`; đã hướng dẫn sửa trên dashboard, chưa xác nhận kết quả. **Lưu ý**: Vercel cần thêm env `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Chưa cấu hình R2 bucket.

---

## 3. Các bước tiếp theo (Next actions)

1. **NestJS Platform API**: JWT guard (verify qua JWKS, URL đã có trong .env), `PlatformAdminGuard`, `TenantContext`, `ModuleAccessGuard` (dựa `my_module_ids()`); endpoints superadmin: CRUD công ty (tạo kèm admin user + gán app_metadata), CRUD hợp đồng + entitlements → sau đó mở khóa các nút "Tạo công ty"/"Lập hợp đồng" đang disabled trong console.
4. **Xây Metadata Engine phía frontend**: zod schema cho UI metadata, Component Registry, FormRenderer/GridRenderer (tuân `ui-design.mdc` — responsive 3 thiết bị).
5. **Cấu hình R2**: bucket + service backend đọc/ghi metadata JSON theo key convention `tenants/{tenant_id}/metadata/...`.
6. **Module nghiệp vụ đầu tiên** (ví dụ WorkOrder): bắt đầu bằng Aggregate Design Blueprint theo `ddd-blueprint.mdc`.

---

## 4. Nhật ký phiên làm việc

| Ngày | Việc đã làm |
|---|---|
| 2026-08-01 | Khởi tạo 5 Cursor Rules + hệ thống Context Tracking (ADR, current-state) |
| 2026-08-01 | Bổ sung `skills-workflow.mdc` (Superpowers) + `ui-design.mdc` (ui-ux-pro-max, responsive 3 thiết bị); ghi ADR-005, ADR-006 |
| 2026-08-01 | Chốt NestJS (ADR-007); scaffold pnpm monorepo: @optimake/web (Next 16), @optimake/api (Nest 11), @optimake/domain; typecheck/build/lint đều pass |
| 2026-08-01 | Commit đầu tiên + push lên GitHub duongcanhquan/redeco (merge với README khởi tạo trên remote) |
| 2026-08-01 | Supabase CLI + supabase init; viết migration 0001 (tenants, user_profiles, RLS, current_tenant_id); tạo .env.example + apps/api/.env — chờ password để apply |
| 2026-08-01 | Điền đủ credentials (.env); xác minh schema remote khớp migration (user đã chạy SQL thủ công); migration repair → history đồng bộ; thêm scripts/inspect-db.cjs |
| 2026-08-01 | Brainstorm + duyệt spec Platform Core (5 quyết định, ADR-008); migration 0002 apply (6 bảng mới + 3 functions quyền); seed 13 node catalog; types platform vào @optimake/domain |
| 2026-08-01 | Design System persist (design-system/optimake); tạo superadmin; trang /login theo mẫu animated; console /platform (bento + glass, 6 trang); proxy bảo vệ route; smoke test pass |
| 2026-08-01 | Rebrand REDECO → **Optimake**: logo mark SVG mới (lục giác + mũi tên, gradient cyan, `components/brand/logo.tsx`), favicon `app/icon.svg`, đổi scope packages @optimake/*, cập nhật toàn bộ docs/rules |
| 2026-08-01 | Ghi nhớ đăng nhập: proxy auto-redirect admin đã đăng nhập từ `/`+`/login` vào thẳng `/platform`; checkbox "Ghi nhớ đăng nhập" lưu email vào localStorage (`optimake.remember_email`) |
| 2026-08-01 | Superadmin mutations (ADR-009): migration 0003 (platform đọc tenants/user_profiles); Server Actions tạo công ty + admin, lập hợp đồng + gán module subtree, đổi trạng thái HĐ; smoke test DB pass |
| 2026-08-01 | Hoàn thiện console: tạm dừng/kích hoạt công ty, reset mật khẩu admin, gia hạn HĐ, badge module đã bán, quản lý danh mục module (thêm/sửa/bật-tắt), sửa tham số hệ thống |
| 2026-08-01 | **Module Kinh doanh Phase 1 (O2C)**: blueprint DDD; migration 0004 (9 bảng + RLS module-aware + decrement_stock); workspace `/app` menu động; 6 trang sales (CRM, sản phẩm/kho, báo giá duyệt, đơn hàng credit+ATP, giao hàng trừ tồn, hóa đơn công nợ); smoke test 9 bước pass; seed công ty demo |
