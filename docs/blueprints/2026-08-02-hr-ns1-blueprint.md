# Aggregate Design Blueprint: HR — Phase NS1 (Core)

> Module catalog: **`nhan-su`**. Ngày: 2026-08-02.  
> Slice đã chọn: **A — Core HR** (Org + Employee + Contract).  
> **Trạng thái: ĐÃ DUYỆT + NS1 ĐÃ TRIỂN KHAI** (2026-08-02).

## 0. Scope NS1

**Trong scope**

- Cây phòng ban / xưởng / tổ (`Department`)
- Chức danh đơn giản trên employee (text + optional `job_title` lookup nhẹ)
- Hồ sơ nhân viên (`Employee`) — cá nhân, liên hệ, trạng thái làm việc
- Hợp đồng lao động (`EmploymentContract`) — loại, thời hạn, phụ lục JSONB
- Hub UI `/{slug}/hr` (tổng quan, phòng ban, nhân viên)
- RLS `has_module_access('nhan-su')`; entitle demo
- `tenant_settings.hr` tối thiểu (mã NV prefix…)

**Ngoài scope NS1** (đặc tả đầy đủ — pha sau)

- Ca kíp, chấm công, timesheet, máy vân tay (NS2)
- Nghỉ phép workflow, payroll, piece-rate (NS3)
- KPI / đào tạo / chứng chỉ (NS4)
- ATS / offboarding đầy đủ (NS5)
- Hành chính HSE / suất ăn / xe (`hanh-chinh` — module riêng)
- AI rostering / Copilot / predictive turnover

## 1. Name

**HumanResources** (Bounded Context) — Aggregate roots NS1: `Department`, `Employee`, `EmploymentContract`.

## 2. Context

- **Vai trò**: SSOT hồ sơ người lao động nhà máy; nền cho T&A / payroll / headcount SX sau này.
- **Ranh giới**:
  - **Không** thay `user_profiles` / Auth: đăng nhập ERP vẫn qua Supabase Auth.
  - `Employee.user_id` **optional** — gắn tài khoản khi công nhân/cán bộ có login; công nhân không login vẫn có hồ sơ.
  - **Không** ghi công / lương / ca trong NS1.
  - Module `hanh-chinh` (văn bản, HSE…) tách catalog — NS1 không đụng.

## 3. Properties

### 3.1 Department (Phòng ban / xưởng / tổ)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | RLS |
| parent_id | UUID \| null | Cây tự tham chiếu |
| code | TEXT | Unique/tenant |
| name | TEXT | |
| kind | TEXT | `company` \| `division` \| `workshop` \| `team` \| `office` \| `other` |
| sort_order | INT | |
| is_active | BOOLEAN | |
| attributes | JSONB | địa điểm xưởng, ghi chú… |

### 3.2 Employee (Hồ sơ nhân viên)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| code | TEXT | Mã NV unique/tenant (VD NV-0001) |
| full_name | TEXT | |
| status | TEXT | `active` \| `on_leave` \| `terminated` \| `draft` |
| department_id | UUID \| null | FK Department |
| job_title | TEXT | Chức danh (NS1: text; bảng JobTitle riêng ở pha sau nếu cần) |
| user_id | UUID \| null | FK logic → `auth.users` / `user_profiles.id` — optional, unique/tenant khi not null |
| hired_on | DATE \| null | |
| terminated_on | DATE \| null | |
| phone | TEXT \| null | |
| email | TEXT \| null | |
| attributes | JSONB | CCCD, người thân, BHXH số, thuế MST, địa chỉ… (metadata-driven sau) |

### 3.3 EmploymentContract (Hợp đồng LĐ)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| employee_id | UUID | FK Employee |
| code | TEXT | Unique/tenant |
| contract_type | TEXT | `probation` \| `definite` \| `indefinite` \| `seasonal` \| `other` |
| status | TEXT | `draft` \| `active` \| `expired` \| `terminated` |
| starts_on | DATE | |
| ends_on | DATE \| null | null = không xác định thời hạn |
| base_salary | NUMERIC \| null | Lương cơ bản tham chiếu (payroll thật ở NS3) |
| attributes | JSONB | phụ lục, điều khoản… |

**Quan hệ**: 1 Employee — N Contract (lịch sử). NS1: tối đa **một** contract `active` tại một thời điểm.

### Dynamic (JSONB)

- Trường hồ sơ tùy DN (mã chấm công thiết bị, bậc thợ, skill tags…) nằm `employees.attributes`.
- Phụ lục HĐ → `employment_contracts.attributes`.

## 4. Enforced Invariants

1. `department` cùng `tenant_id`; không tạo chu trình `parent_id` (cha ≠ con / không vòng).
2. `employee.code` unique trong tenant; `user_id` nếu có thì unique trong tenant.
3. Employee `terminated` → không gán HĐ `active` mới; `terminated_on` bắt buộc khi status = terminated.
4. Một employee chỉ có **một** contract `status = active` tại một thời điểm.
5. Contract `ends_on` (nếu có) ≥ `starts_on`.
6. Chỉ owner/admin (manager) được CUD Department / Employee / Contract; member `nhan-su` đọc (hoặc chỉ hồ sơ gắn `user_id` của mình — NS1 đơn giản: member đọc toàn tenant nếu có quyền module; tinh chỉnh sau).

## 5. Corrective Policies

- Xóa mềm phòng ban: `is_active = false` — không hard delete nếu còn employee gắn; bắt buộc chuyển department hoặc clear trước.
- HĐ hết hạn theo `ends_on`: job sau (NS2+) chuyển `expired`; NS1 cho phép cập nhật tay.
- Ngắt liên kết `user_id` khi user bị xóa khỏi tenant (best-effort null).

## 6. Domain Events (ghi nhận; chưa bắt buộc bus)

| Event | Trigger | Consumer dự kiến |
|---|---|---|
| EmployeeHired | Tạo employee active + HĐ active | (sau) IT provision, canteen |
| EmployeeTerminated | status → terminated | (sau) revoke access, offboarding |
| ContractActivated | HĐ → active | (sau) payroll setup |

## 7. Phase triển khai NS1 (deliverables)

1. Migration: `hr_departments`, `hr_employees`, `hr_employment_contracts` + RLS + indexes `(tenant_id, …)`.
2. Domain types nhẹ trong `@optimake/domain` (status unions, helpers validate ngày HĐ).
3. Service `hr.service.ts` + Server Actions.
4. UI hub: Tổng quan · Phòng ban · Nhân viên (list + form tạo/sửa; HĐ trên chi tiết NV).
5. Seed catalog children optional: `nhan-su.phong-ban`, `nhan-su.nhan-vien` (hoặc chỉ root `nhan-su` như Kho early).
6. `scripts/entitle-demo-hr.cjs` + smoke schema/logic tối thiểu.
7. Cập nhật `docs/current-state.md`.

## 8. Settings (`tenant_settings` namespace `hr`)

| Key | Default | Ý nghĩa |
|---|---|---|
| `employee_code_prefix` | `NV` | Prefix mã NV |
| `show_salary_on_contract` | `true` | Ẩn lương cơ bản trên UI nếu false (role-sensitive sau) |

## 9. Bảo mật

- RLS: `tenant_id = current_tenant_id()` AND `has_module_access('nhan-su')`.
- Mutate: `requireManager` (owner/admin) giống Kho danh mục.
- Không lưu file scan CCCD trên DB — metadata path R2 sau (NS1: không upload).
