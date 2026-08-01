# Spec: Platform Core — Multi-tenant SaaS ERP/MES

**Ngày**: 2026-08-01 · **Trạng thái**: Đã duyệt (người dùng xác nhận "bắt đầu đi")

## 1. Mục tiêu

Xây lõi nền tảng cho mô hình bán phần mềm theo công ty:

- **Superadmin** (cấp nền tảng): tạo công ty, tạo admin công ty, quản lý hợp đồng (thời hạn, seats, module mua), nhận nhắc hạn, chỉnh tham số hệ thống.
- **Admin công ty**: tạo nhân sự, phân công module trong phạm vi hợp đồng đã mua.
- **Nhân viên**: chỉ thấy đúng module được phân công.
- Cách ly tuyệt đối giữa các công ty trên Supabase (RLS) và R2 (key prefix theo tenant).

## 2. Các quyết định đã chốt (với người dùng)

| Quyết định | Lựa chọn |
|---|---|
| URL công ty | Subdomain `congty1.abcxyz.com` ngay từ đầu (dev: `congty1.localhost:3000`) |
| Superadmin console | Cùng app Next.js, khu vực `/platform` trên domain gốc |
| Tài khoản | 1 email = 1 công ty |
| Nhắc hạn hợp đồng | Dashboard + email tự động mốc 30/14/7 ngày |
| Module nghiệp vụ đầu tiên | Kinh doanh (báo giá, đơn hàng, khách hàng) |
| Danh mục module | **Dạng cây**: module → module con/phần → tính năng nhỏ, lồng không giới hạn |

## 3. Ba tầng người dùng & JWT

Một Supabase Auth duy nhất. Quyền nằm trong `app_metadata` (server gán, client không sửa được):

| Tầng | JWT `app_metadata` | Bảng |
|---|---|---|
| Superadmin | `is_platform_admin: true` (không có tenant_id) | `platform_admins` |
| Admin công ty | `tenant_id` + `user_profiles.role in (owner, admin)` | `user_profiles` |
| Nhân viên | `tenant_id` + `role = member` | `user_profiles` + `user_module_assignments` |

## 4. Mô hình dữ liệu (migration 0002)

### `modules` — danh mục dạng CÂY (tự tham chiếu)

- `parent_id → modules.id` (NULL = module gốc). `kind`: `module` | `feature`.
- `key` duy nhất toàn cục theo quy ước dotted-path: `kinh-doanh`, `kinh-doanh.bao-gia`, `kinh-doanh.bao-gia.duyet-gia`.
- Danh mục là dữ liệu (không phải code) → superadmin thêm/sửa module mà không cần deploy.

### `contracts` — hợp đồng theo công ty

- `tenant_id`, `code` (unique), `status` (draft/active/suspended/terminated), `starts_on`, `ends_on`, `seats`, `notes`, `attributes` JSONB.
- Trạng thái hiển thị "sắp hết hạn" tính từ `ends_on` (≤30 ngày), không lưu riêng.

### `contract_entitlements` — hợp đồng mua gì

- `(contract_id, module_id)` unique. **Ngữ nghĩa subtree**: cấp node nào là được toàn bộ nhánh con của node đó.

### `user_module_assignments` — admin công ty phân công

- `(user_id, module_id)` unique, `access_level`: `view`/`edit`/`manage`. Cũng theo ngữ nghĩa subtree.

### `platform_admins`, `platform_settings`

- `platform_admins`: danh sách superadmin (ghi qua service role).
- `platform_settings`: key-value JSONB — các "biến hệ thống" superadmin đổi được (ví dụ mốc ngày nhắc hạn).

### Hàm quyền (SQL, dùng chung cho RLS + API)

- `is_platform_admin()` — đọc JWT.
- `tenant_entitled_module_ids(tenant)` — module công ty được dùng: hợp đồng `active` + còn hạn, mở rộng subtree (recursive CTE).
- `my_module_ids()` — module user hiện tại thấy: admin công ty = toàn bộ entitled; nhân viên = entitled ∩ assigned (mở rộng subtree).

**Quy tắc hiển thị 3 điều kiện** (enforce ở DB + API, không chỉ ẩn UI): hợp đồng còn hiệu lực ∧ hợp đồng có module ∧ user được phân công (trừ admin công ty).

## 5. RLS tóm tắt

| Bảng | SELECT | Ghi |
|---|---|---|
| `modules` | authenticated (node active); superadmin thấy hết | superadmin |
| `contracts` | tenant của mình; superadmin tất cả | superadmin |
| `contract_entitlements` | qua hợp đồng tenant mình; superadmin | superadmin |
| `user_module_assignments` | cùng tenant | admin/owner của tenant đó |
| `platform_admins`, `platform_settings` | superadmin | superadmin / service role |

## 6. Subdomain routing (thực hiện ở phase giao diện)

- Domain gốc: marketing + `/platform`. Subdomain `{slug}.abcxyz.com`: app ERP của công ty.
- Middleware Next.js đọc hostname → tra slug → `tenant_id`; slug sai hoặc hợp đồng hết hạn → trang thông báo.
- Dev local: `{slug}.localhost:3000`. Production: wildcard DNS `*.abcxyz.com` → Vercel.

## 7. Quy ước R2

```
platform/...                       # tài sản hệ thống
tenants/{tenant_id}/metadata/...   # cấu hình UI riêng công ty
tenants/{tenant_id}/uploads/...    # file công ty tải lên
```

API ký URL theo `tenant_id` từ JWT.

## 8. Luồng nghiệp vụ chính

1. **Tạo công ty**: superadmin nhập tên + slug → service role tạo `tenants` + tài khoản admin (gán `app_metadata.tenant_id`) → email mời đặt mật khẩu.
2. **Tạo hợp đồng**: superadmin chọn công ty, thời hạn, seats, tick các node module → `contracts` + `contract_entitlements`.
3. **Tạo nhân sự**: admin công ty nhập tên/email/chức danh → API (service role) tạo user trong tenant, kiểm tra seats còn lại.
4. **Phân công module**: admin công ty tick node trong cây entitled → `user_module_assignments`.
5. **Nhắc hạn**: cron đọc `contracts` sắp hết hạn → email + hiển thị dashboard (mốc lấy từ `platform_settings`).

## 9. Thứ tự triển khai

1. Migration 0002 + seed danh mục (6 module gốc + cây con Kinh doanh) ✅ phase này
2. Types `@redeco/domain` ✅ phase này
3. NestJS: JWT guard (JWKS), TenantContext, PlatformAdminGuard, ModuleAccessGuard + API platform (CRUD công ty/hợp đồng)
4. UI `/platform` (superadmin console) — invoke ui-ux-pro-max trước
5. Subdomain middleware + UI admin công ty
6. Email nhắc hạn (chốt nhà cung cấp email khi đến bước này)

## 10. Ngoài phạm vi phase này

- Thanh toán/billing tự động (hợp đồng quản lý thủ công bởi superadmin).
- Permission matrix chi tiết từng hành động (RBAC đầy đủ) — nâng cấp sau từ `access_level`.
- Một email thuộc nhiều công ty.
