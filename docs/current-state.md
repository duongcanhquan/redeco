# Current State — Bộ nhớ cốt lõi của dự án

> **Quy tắc cho AI Agent**: Đọc tệp này ĐẦU TIÊN ở mỗi phiên làm việc mới. Sau khi hoàn thành mỗi tính năng/module, PHẢI tự động cập nhật tệp này (xem `.cursor/rules/context-tracking.mdc`).

**Dự án**: Optimake — Multi-tenant SaaS ERP/MES (rebrand từ REDECO, 2026-08-01)
**Tech stack**: TypeScript · Next.js 16 (App Router, Turbopack) · NestJS 11 · Supabase (PostgreSQL + RLS) · Cloudflare R2 · pnpm monorepo
**Cập nhật lần cuối**: 2026-08-02

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

### ✅ Module Kho — Phase K1 (2026-08-02)

Blueprint đã duyệt (thứ tự nhà máy). Plan: `docs/superpowers/plans/2026-08-02-inventory-k1.md`.

- **Migration** `20260802120000_inventory_module_k1.sql`: warehouses, inventory_items, stock_balances, reservations, phiếu kho + lines; RLS `kho` (đọc tồn cho phép `kinh-doanh`); RPC `inventory_get_atp`, `inventory_ensure_defaults`, `inventory_apply_line`, `inventory_sync_product_stock`.
- **Service** `inventory.service.ts`; Sales confirm đọc ATP Kho; ship → phiếu XK KHO-TP (fallback `decrement_stock` nếu chưa có kho).
- **UI** `/{slug}/inventory` (+ stock, transactions, warehouses); catalog module `kho`.
- **Demo**: `scripts/entitle-demo-kho.cjs`.

### ✅ Sales Hub bento + analytics (2026-08-02)

- **`/{slug}/sales`** — hub Kinh doanh kiểu bento Nhật: KPI, cột hóa đơn 14 ngày, pipeline đơn, phễu báo giá, hàng đợi (duyệt BG / xuất kho / công nợ), tồn thấp, lối tắt chức năng.
- **Service** `sales-analytics.service.ts` + **charts** SVG/CSS thuần (`bento-charts.tsx`) — không thêm lib chart.
- Workspace dashboard `/{slug}` dùng chung analytics; sidebar thêm **Tổng quan KD** (`exact` match).
- Báo giá: `defaultQuotationValidDays` từ tenant settings → prefill form + fallback khi tạo nếu để trống.
- **Polish**: lọc `?status=` trên BG/ĐH/GH/HĐ; chip filter + drill-down từ pipeline/phễu; danh sách **card trên phone / table desktop** (`responsive-doc-list`); seed `scripts/seed-demo-sales-data.cjs` (chứng từ đa trạng thái + HĐ 14 ngày).

### ✅ Sales Core đóng vòng (2026-08-02) — hoàn thiện lỗ hổng

- **Sửa báo giá nháp** (`updateQuotation` + dialog); chi tiết BG `/sales/quotations/[id]`, ĐH `/sales/orders/[id]`.
- **currencyLabel** dùng trong `formatMoney`; **debtWarningDays** → badge «quá hạn cảnh báo» (tuổi nợ từ `issued_on`) trên HĐ + hub.
- Settings AI / webhook / email: copy rõ «lưu cấu hình — chưa kích hoạt runtime».
- Card phone KH + SP; catalog seed bổ sung `san-pham`, `giao-hang`, `hoa-don`, `chiet-khau`, `duyet`.
- **5 module gốc khác** (SX, KT, NS, HC, TB): vẫn placeholder «sắp ra mắt» — cần Blueprint trước khi implement (theo `ddd-blueprint.mdc`).

### ✅ Cài đặt công ty — Settings Hub đa tab (2026-08-02)

Spec: `docs/superpowers/specs/2026-08-02-tenant-settings-design.md`.

- **Migration** `20260802110000_tenant_settings.sql` (ĐÃ apply): bảng `tenant_settings (tenant_id, namespace, key, value jsonb)` — namespace `ai|sales|integrations|notifications|company`, RLS theo tenant.
- **UI `/settings?tab=`** (TabBar glass, responsive): **Tổng quan** · **AI & API** · **Kinh doanh** / Kho / SX / KT (khi entitled) · **Tích hợp** (webhook + secret) · **Email & SMS**. Tab module chỉ hiện khi entitled; sửa chỉ owner/admin.
- **Service** `tenant-settings.service.ts`: mask API key; giữ key cũ nếu client gửi chuỗi mask; `allowConfirmWithoutAtp` được enforce trong `confirmSalesOrder`.
- **Honesty**: badge «Đang lưu cấu hình» + HelpTip — AI / webhook / email / SMS chưa gửi thật (chưa có worker).
- **Verify**: typecheck/lint/build sạch.

### ✅ Hub Setup Kinh doanh + icon menu (2026-08-02)

Spec: `docs/superpowers/specs/2026-08-02-sales-setup-hub-design.md`.

- **Cài đặt → Kinh doanh** (`?tab=sales&panel=`): Tổng quan setup (checklist + %), Chứng từ, Xác nhận & tồn, Duyệt, Chiết khấu, Giao & HĐ, Profile.
- Preset hệ thống (B2C / B2B / Đại lý) + profile công ty (lưu/áp/ghi đè/xóa) trong `tenant_settings` keys `setup_flags`, `profiles`, `active_profile_id`.
- Áp snapshot đồng bộ cờ giữ chỗ sang namespace `inventory`; rà soát mâu thuẫn (banner vàng).
- Icon Lucide chung `lib/hub-nav-icons.tsx` cho sidebar con + HubTabBar.

### ✅ Sales — In chứng từ + gắn SX + setup AI/Webhook/Email/SMS (2026-08-02)

- **In**: trang print BG / ĐH / GH / HĐ (`/sales/.../[id]/print`) + CSS `@media print`; nút In trên chi tiết/list.
- **Gắn SX**: CTA «Tạo lệnh SX» trên đơn thiếu hàng (khi entitled `san-xuat`) → draft WO theo shortfall (`createWorkOrdersFromSalesOrder`).
- **Settings UI**: form AI / Tích hợp / Email & SMS nhóm rõ, SMS provider (Twilio/Viettel/custom), secret webhook.

### ✅ Module Kinh doanh — Core Phase 2 (2026-08-02)

Siết Must-have O2C theo brainstorming (hướng A + duyệt N cấp B). Spec: `docs/superpowers/specs/2026-08-02-sales-core-phase2-design.md` · Plan: `docs/superpowers/plans/2026-08-02-sales-core-phase2.md`.

- **Migration** `20260802100000_sales_core_phase2.sql` (ĐÃ apply): `discount_rules`, `approval_workflows` + `approval_workflow_steps`, `quotation_approval_actions`, `sales_outbox`; quotations thêm workflow/step/rule; orders thêm `promise_check`. RLS InitPlan + `has_module_access('kinh-doanh')`.
- **Domain**: `pickWinningDiscountRule`, `requiredApprovalSteps`, `canActOnApprovalStep`, `buildPromiseCheck` (CTP stub).
- **CRM**: `/sales/customers/[id]` timeline BG/ĐH/GH/HĐ/thanh toán + công nợ/credit.
- **Chiết khấu**: `/sales/discount-rules` (manager); tự áp khi tạo BG (checkbox).
- **Duyệt N cấp**: `/sales/approvals` cấu hình; gửi duyệt tạo chuỗi bước theo ngưỡng; Duyệt bước / Từ chối; owner override.
- **SO confirm**: credit + ATP + `promise_check` CTP stub; modal hiện CTP reason.
- **Outbox**: `DeliveryShipped`, `InvoiceCreated`, `InvoicePaid` → sẵn cho Kế toán.
- **Verify**: typecheck/lint/build sạch; `scripts/test-sales-core-phase2.cjs` logic PASS.

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

### ✅ Gán module theo công ty + Quản lý thành viên tenant (2026-08-01)

Chỉnh theo góp ý người dùng: gán module làm ở trang Công ty (không phải sửa catalog); khách hàng tự tạo user theo chức năng.

- **Danh mục module superadmin = CHỈ ĐỌC** (`module-catalog-view.tsx`, accordion nhóm có nút sổ); đã xóa modules-manager + các hàm mutation catalog khỏi service. Thay đổi catalog đi qua migration/seed.
- **Gán module tại trang Công ty**: component dùng chung `components/platform/module-tree-picker.tsx` — mỗi module gốc là 1 NHÓM có nút sổ xuống, tick module gốc = cấp cả nhánh (subtree ADR-008), tick lẻ từng phần con được; có chế độ readOnly. Trang Công ty thêm cột "Module được cấp" (badge theo nhóm) + nút **Gán module** (modal, ghi vào hợp đồng đang hiệu lực; chưa có thì tự sinh hợp đồng active 1 năm — `setTenantModules`). **Tạo công ty** giờ chọn được module + seats ngay trong dialog (tự sinh hợp đồng kèm entitlements, rollback trọn gói nếu lỗi).
- **Workspace khách hàng**:
  - `/app/members` (chỉ owner/admin): tự tạo user theo chức năng — email/mật khẩu (sinh ngẫu nhiên, hiện 1 lần + copy), vai trò Quản trị/Thành viên, phân công module bằng cây CHỈ GỒM module công ty được cấp (`getEntitledModuleTree`); sửa vai trò/phân công, reset mật khẩu, xóa thành viên (chặn owner + chính mình); **seat limit** theo hợp đồng (chặn tạo khi đầy). Service: `tenant-admin.service.ts` — mutations dùng service role NHƯNG sau `assertTenantAdmin()` và chỉ trong tenant của người gọi; email member lưu `user_profiles.attributes.email`.
  - `/app/settings`: 3 card (công ty, hợp đồng + hạn, seats đã dùng) + **cây module đã cài đặt** (readOnly picker).
  - Menu thêm nhóm "Công ty": Thành viên (admin) + Cài đặt.
- **Migration 0005** (`20260801190000_module_access_descendants.sql`, ĐÃ apply): `has_module_access(p_key)` giờ nhận cả node CON trong nhánh (dotted-path `like p_key || '.%'`) — member chỉ được giao `kinh-doanh.bao-gia` vẫn vào được dữ liệu sales + thấy menu (getMyRootModules đổi theo: hiện root khi có bất kỳ node nào trong nhánh).
- **Đã verify**: typecheck/lint/build sạch; smoke test `scripts/test-members-flow.cjs` (5 bước, JWT thật, tự dọn): owner đủ 8 node; member giao node con đọc được sales; member chưa phân công bị RLS chặn; member không tự phân công được (RLS uma) — PASS.

### ✅ Superadmin gọn còn 3 mục — gộp bằng tab (2026-08-01)

Theo góp ý: superadmin chỉ quản lý khách hàng + hợp đồng + theo dõi tổng kết; gộp phần trùng nhau; dùng tab tối đa cho desktop/iPad/phone.

- **Sidebar còn 3 mục**: Tổng quan / Khách hàng / Tài khoản.
- **Trang Khách hàng (`/platform/companies?tab=…`) gộp 3 tab** (component `components/platform/tab-bar.tsx` — tab bar glass, cuộn ngang trên phone, badge số đếm, deep-link qua query param):
  - `Khách hàng` (mặc định): bảng công ty + Gán module + Tạo công ty (kèm module/seats).
  - `Hợp đồng`: bảng hợp đồng + Lập hợp đồng + đổi trạng thái/gia hạn (nút header đổi theo tab).
  - `Danh mục module`: catalog CHỈ ĐỌC (accordion), ghi chú rõ việc cấp module làm ở tab Khách hàng.
- **Route cũ redirect**: `/platform/contracts` → `?tab=contracts`, `/platform/modules` → `?tab=modules`; các link dashboard đã trỏ theo tab.
- **Bỏ trang Tham số superadmin** (xóa settings page/editor/actions + `updatePlatformSetting`/`listSettings`): cài đặt, tham số vận hành thuộc phần cài đặt của khách hàng (`/app/settings`); `platform_settings` trong DB giữ nguyên cho cron nhắc hạn.
- **Đã verify**: typecheck/lint/build sạch (10 route, contracts/modules giờ là redirect).

### ✅ Tối ưu hiệu năng toàn diện (2026-08-01)

Người dùng phản ánh bấm/phản hồi chậm, truy xuất dữ liệu chậm. 4 tối ưu:

1. **Migration 0006** (`20260801200000_rls_initplan_perf.sql`, ĐÃ apply): bọc mọi lời gọi hàm trong RLS policy vào `(select ...)` (InitPlan pattern theo Supabase docs) — trước đó `has_module_access('kinh-doanh')` (2 recursive CTE) và `current_tenant_id()` bị đánh giá LẠI TỪNG DÒNG trên 9 bảng sales + toàn bộ bảng platform; giờ tính đúng 1 lần mỗi câu lệnh. Càng nhiều dữ liệu chênh lệch càng lớn.
2. **Bỏ round-trip Auth mỗi request**: proxy đổi `getUser()` (gọi mạng ~200-500ms) → `getSession()` (đọc cookie, chỉ gọi mạng khi token hết hạn cần refresh ~1 lần/giờ). Server components/services dùng helper mới `getSessionClaims()` (`lib/supabase/server.ts`) — decode claims trực tiếp từ access token, bọc React `cache()` dedupe trong request. **An toàn**: claims lấy từ chính token mà mọi query DB mang theo (token giả → Supabase từ chối chữ ký → RLS chặn); riêng luồng service role: `assertPlatformAdmin` giữ `getUser()` verify đầy đủ, `assertTenantAdmin` được "verify gián tiếp" qua bước đọc role từ `user_profiles` bằng client RLS (token giả → query fail → role member → chặn).
3. **`loading.tsx` skeleton** cho `/platform` + `/app` (`components/platform/page-skeleton.tsx`): bấm menu là hiện skeleton NGAY, data stream về sau — hết cảm giác "bấm không ăn".
4. **Router cache** (`next.config.ts` `experimental.staleTimes: {dynamic: 30}`): trang đã xem giữ 30s phía client, bấm qua lại menu tức thì; Server Action + revalidatePath vẫn xóa cache ngay khi dữ liệu đổi. `createServerSupabase` cũng bọc `cache()` — 1 client/request.

- **Đã verify**: typecheck/lint/build sạch; smoke test `test-sales-flow.cjs` (9 bước) + `test-members-flow.cjs` (5 bước) PASS — RLS giữ nguyên hành vi sau InitPlan wrap.

### ✅ Landing page motion tại `/` (2026-08-01)

Trang chủ marketing giới thiệu Optimake (trước đó `/` chỉ redirect về login). Theo skill ui-ux-pro-max + design system optimake (dark navy + cyan neon, glass, Be Vietnam Pro).

- **Trang TĨNH** (prerendered ○) — tải tức thì; motion thuần CSS transform/opacity + IntersectionObserver, TẤT CẢ tôn trọng `prefers-reduced-motion` (keyframes trong `globals.css`: aurora-drift, float-y, bar-grow, typing-dot, dash-flow, glow-pulse, robot-wave, `.reveal`).
- **Cấu trúc**: navbar glass sticky → hero (aurora + lưới kỹ thuật, headline gradient, mock dashboard có bar chart mọc lên + 2 card nổi ATP/AI forecast) → stats strip → 4 card "nỗi đau" (Excel phân mảnh, không dám hứa ngày giao, công nợ, báo cáo trễ) → bento module (Kinh doanh ĐANG VẬN HÀNH + 6 module sắp ra mắt) → khu AI (ERP Copilot chat mock có chấm đang gõ, dự báo ML, churn/NBA) → quy trình Order-to-Cash 6 bước có dòng chảy animated → CTA → footer.
- **Robot easter egg** (`components/landing/robot-easter-egg.tsx`): hotspot góc trái dưới, rê chuột vào robot ló lên vẫy chào (spring), tooltip "Bíp bíp… khu quản trị", bấm → `/login` (superadmin); Tab tới cũng hiện (focus-within) — vẫn a11y.
- Component `components/landing/reveal.tsx` (IO reveal + stagger delay). Proxy giữ nguyên: đã đăng nhập vào `/` sẽ auto về `/platform` hoặc `/app`.
- **Đã verify**: typecheck/lint/build sạch, `/` là route static; HTTP 200 + đủ nội dung khi chạy thử.
- **Motion v3 — landing "động" liên tục** (theo góp ý): thanh **scroll progress** gradient sát mép trên (`scroll-progress.tsx`, rAF); **CountUp** (`count-up.tsx`, IO + rAF ease-out, tabular-nums, SSR render sẵn giá trị cuối) cho stats strip (9+/100%/6 bước/24-7) và số liệu hero mock; **marquee** chữ chạy ngang vô hạn sau hero; **hạt sáng** bay lên trong hero (11 hạt deterministic, CSS var --dur/--delay/--drift); **vòng conic quay chậm** sau hero mock (`hero-ring`); **tia Beam** nối liền giữa các section (đường dọc + giọt sáng chảy xuống lặp — liền mạch giữa các màn); chart hero **"thở"** liên tục sau khi mọc (`bar-breathe` = bar-grow + bar-pulse infinite); heading gradient **lấp lánh** (`text-shimmer`); icon card **nhún** khi hover (`icon-bounce`). Tất cả trong reduced-motion đều tắt (hạt ẩn hẳn).
- **Redesign v2** (theo góp ý): BỎ nhãn "Sắp ra mắt" — 8 nền tảng được giới thiệu đầy đủ (MES, Kho, Kế hoạch, Chất lượng+AI, Nhân sự, Hành chính số, Tài chính & tối ưu chi phí, Phân tích AI) mỗi card có mô tả + 3 bullet + hiệu ứng shimmer sweep + hover lift. Nỗi đau xoáy vào **kiểm soát quy trình chậm** và **các bước không đồng bộ realtime** (2 card "ĐAU NHẤT" + dải pipeline LIVE các chip bước sáng lên lần lượt — keyframe `step-live`). Section MỚI `#ca-nhan-hoa`: "phần mềm tự uốn theo bạn" — visual quỹ đạo 8 nền tảng xoay quanh Lõi AI (`orbit`/`orbit-reverse`, icon luôn thẳng nhờ counter-rotate, bán kính responsive qua CSS var `--orbit-r`) + chip mô hình MTO/MTS/ETO/OEM/B2B; 4 điểm: cấu hình không cần code, quy trình tùy biến, AI học vận hành, bật module theo giai đoạn. Motion mới: `pulse-ring` (vòng lan tỏa các bước O2C), `blink-dot` (LIVE), `shimmer-card` — tất cả có reduced-motion.

### ✅ Tên miền công ty — /{slug}/... + login riêng từng công ty (2026-08-01)

Mỗi công ty khách hàng hoạt động dưới đường dẫn riêng `/{slug}/...` (vd `/demo/login`) trong MỌI tình huống — **không** dùng subdomain `slug.optimake.com`. Superadmin đặt/đổi được "tên miền" (slug) dễ nhớ.

- **Claim `tenant_slug` trong JWT** (`app_metadata`): set khi tạo công ty (`createCompanyWithAdmin`) và tạo member (`createMember`); user cũ đã backfill bằng `scripts/backfill-tenant-slug.cjs` (idempotent). `getSessionClaims()` trả thêm `tenantSlug`.
- **Chuẩn hóa slug** (`lib/tenant-slug.ts`): `RESERVED_TENANT_SLUGS`, `slugifyTenantName`, `validateTenantSlug`, `isTenantPathSegment` — dùng chung proxy + superadmin + form tạo/đổi tên miền.
- **Proxy** (`apps/web/src/proxy.ts`): `/{slug}/...` **rewrite** nội bộ về `/app/...`; `/{slug}/login` rewrite về `/login`. Ép chặt: chưa đăng nhập → `/{slug}/login`; gõ `/app/...` → `/{slug}/...`; vào prefix công ty KHÁC → về đúng công ty mình; chữ hoa `/Demo` → `/demo`. Superadmin vẫn mở được `/{slug}/login` (không bị đá về `/platform`).
- **Login riêng công ty**: nhận diện slug từ pathname; hiện tên qua RPC `tenant_public_name`; cảnh báo nếu slug không tồn tại. Sau đăng nhập → `/{slug}`.
- **Đăng xuất**: luôn về `/{slug}/login` của chính công ty.
- **Superadmin**: cột khách hàng có **link bấm được** `/{slug}/login` (mở tab mới); nút **"Tên miền"** đổi slug + đồng bộ claim toàn bộ user.
- **Nguyên nhân 404 thường gặp**: mở nhầm dạng subdomain `slug.optimake.com` (chưa cấu hình DNS) thay vì path `/{slug}/login`; hoặc deploy cũ chưa có proxy rewrite.
- **Đã verify**: typecheck/lint/build sạch; smoke test `scripts/test-tenant-domain.cjs` 12/12 PASS.

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

- Sidebar: thu/mở desktop (icon rail), drawer phone/tablet; bỏ diễn giải dưới tiêu đề danh mục; bỏ HubTabBar; phân hệ có nút sổ + mục con.
- Login: vòng giữa màn; Optimake giữa đỉnh & mép ngoài vòng; tên CT sát mép trong trên; form đẩy xuống dưới.
- AI = module catalog `ai` (+ `ai.kinh-doanh.*`): superadmin cấp trên HĐ; admin công ty cấu hình key + cờ; runtime hỏi đáp / đánh giá BG·ĐH.
- **A Giữ chỗ (K2)** đã wire; tiếp **B** GH/HĐ linh hoạt · **C** bảng giá.
- Demo: `demo@optimake.com` / `Demo@123`.

---

## 3. Các bước tiếp theo (Next actions)

1. **B** Hóa đơn / Giao hàng song song + đặt cọc; **C** Bảng giá theo loại khách.
2. Worker webhook/email/SMS; Metadata Engine + R2.
3. (Tuỳ chọn) Profile v2 nhúng snapshot bước duyệt / rule CK.

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
| 2026-08-01 | **Gán module theo công ty + thành viên tenant**: catalog module chỉ đọc; picker cây module nhóm-nút-sổ dùng chung; gán module tại trang Công ty (+ chọn module khi tạo công ty); `/app/members` (tạo user theo chức năng, phân công module, seat limit) + `/app/settings` (cây module đã cài); migration 0005 has_module_access nhận node con; test 5 bước pass |
| 2026-08-02 | Sales Core Phase 2 + Tenant Settings Hub + domain path `/{slug}` |
| 2026-08-02 | **Sales Hub bento**: analytics service, SVG charts, `/{slug}/sales`, dashboard workspace, default hiệu lực BG từ settings |
| 2026-08-02 | Sales polish: filter status + card phone, drill-down chart, seed chứng từ demo analytics |
| 2026-08-02 | Đóng Sales Core: sửa BG nháp, detail BG/ĐH, currency+debt warn, catalog seed, honesty settings |
| 2026-08-02 | Fix search + CTP copy; Blueprint lộ trình nhà máy (Kho/SX/KT) chờ duyệt |
| 2026-08-02 | **Kho K1**: migration, service, UI `/inventory`, ATP+XK bridge Sales, entitle demo |
| 2026-08-02 | **ADR-010** cá nhân hóa tenant; settings `inventory`/`production`; **SX1** BOM/LSX/CTP + entitle demo |
| 2026-08-02 | **ADR-011** composable modules; **KT1** AR/COGS optional + settings + `/accounting` |
| 2026-08-02 | UI hubs: HelpTip `?`, FlowSteps, biểu đồ, copy đơn giản; BOM nhiều dòng NVL |
| 2026-08-02 | Sales: in chứng từ BG/ĐH/GH/HĐ; CTA tạo LSX từ đơn thiếu hàng; redesign settings AI/webhook/email/SMS |
| 2026-08-02 | QA parallel: fix idempotency O2C (GH/HĐ/LSX), HĐ từ confirmed, UI touch/print mobile; dead settings disabled |
| 2026-08-02 | Menu N2+R2: sidebar gọn, hub tab theo quyền node con, chữ Việt + mở ngoặc viết tắt |
| 2026-08-02 | Giữ chỗ tồn khi confirm đơn (RPC + settings); menu + reservation commit |
| 2026-08-02 | QA fix: R2 tab filter, giữ chỗ cho KD, chỉ kho TP, consume sau validate, redirect layout |
| 2026-08-02 | Perf UX: loading từng phân hệ, useLinkStatus, cache nav, thanh tiến trình, nút spinner tức thì |
| 2026-08-02 | HDSD Kinh doanh: trang /sales/huong-dan + nút HDSD trên tổng quan (luồng, mock UI, bảng) |
| 2026-08-02 | Hub Setup KD: panel/checklist/preset/profile; icon menu hub+sidebar; contrast HDSD |
| 2026-08-02 | **Module Trợ lý AI**: catalog `ai` + `ai.kinh-doanh.*`; superadmin cấp HĐ; admin cấu hình key/cờ; entitle demo |
