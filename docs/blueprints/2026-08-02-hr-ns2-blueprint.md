# Aggregate Design Blueprint: HR — Phase NS2 (Time & Attendance mỏng)

> Module: **`nhan-su`**. Ngày: 2026-08-02.  
> Phụ thuộc: NS1 (Employee).  
> **Trạng thái: ĐÃ DUYỆT theo chỉ thị «làm tiếp» sau NS1** — triển khai ngay.

## 0. Scope NS2

**Trong scope**

- `Shift` — định nghĩa ca (bắt đầu/kết thúc, nghỉ giữa ca phút, OT sau giờ chuẩn)
- `AttendanceLog` — giờ vào/ra theo ngày + NV (+ optional shift)
- Domain `processTimesheet(log, shift)` → giờ chuẩn, muộn, sớm, OT
- UI: danh mục ca; nhập/xem chấm công; xem kết quả tính công
- RLS cùng `nhan-su`

**Ngoài scope**

- Máy vân tay / FaceID API thật (stub source = `manual`)
- Rostering tháng / đổi ca / OT duyệt
- Leave workflow, Payroll (NS3)
- AI xếp ca

## 1. Aggregates

### Shift

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| tenant_id | UUID | |
| code | TEXT | Unique/tenant |
| name | TEXT | |
| start_time | TIME | VD 08:00 |
| end_time | TIME | VD 17:00 (qua đêm: end < start) |
| break_minutes | INT | ≥ 0 |
| standard_minutes | INT | giờ công chuẩn trong ca (sau trừ nghỉ) — hoặc tính từ start/end − break |
| is_active | BOOLEAN | |
| attributes | JSONB | |

### AttendanceLog

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| tenant_id | UUID | |
| employee_id | UUID | FK hr_employees |
| work_date | DATE | |
| shift_id | UUID \| null | FK hr_shifts |
| clock_in | TIMESTAMPTZ | |
| clock_out | TIMESTAMPTZ \| null | |
| source | TEXT | `manual` \| `device` \| `import` |
| attributes | JSONB | kết quả tính công cache optional |

**Quan hệ**: 1 Employee — nhiều log (theo ngày/ca). NS2: unique `(tenant_id, employee_id, work_date, shift_id)` với shift_id coalesce sentinel — đơn giản: unique `(tenant_id, employee_id, work_date)` một dòng/ngày.

## 2. Invariants

1. `clock_out` null hoặc ≥ `clock_in`
2. Employee cùng tenant; shift cùng tenant
3. Timesheet: OT = max(0, worked − standard); late = max(0, in − shift.start); early = max(0, shift.end − out) khi có out

## 3. Deliverables

Migration + domain `processTimesheet` + service + tabs Ca / Chấm công + hub link.
