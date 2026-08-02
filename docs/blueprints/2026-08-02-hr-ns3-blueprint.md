# Aggregate Design Blueprint: HR — Phase NS3 (Leave + Payroll mỏng)

> Module: **`nhan-su`**. Ngày: 2026-08-02.  
> Phụ thuộc: NS1 Employee/Contract, NS2 Attendance (OT).  
> **Trạng thái: ĐÃ DUYỆT theo «làm tiếp» sau NS2.**

## Scope NS3

**Trong**

- Loại phép (`LeaveType`) + đơn nghỉ (`LeaveRequest`) + duyệt đơn giản (pending → approved/rejected)
- `PayrollRun` theo kỳ (tháng) + `PayrollLine` (lương CB từ HĐ active + OT phút từ attendance × đơn giá OT settings)
- UI: Nghỉ phép · Bảng lương
- RLS `nhan-su`

**Ngoài**

- Piece-rate / thưởng năng suất SX, BHXH đầy đủ, payslip email, tạm ứng, ATS, AI
- Workflow duyệt N cấp theo org chart (NS3: manager duyệt tay)

## Aggregates

### LeaveType
code, name, paid (bool), annual_quota_days (nullable), is_active

### LeaveRequest
employee_id, leave_type_id, starts_on, ends_on, days, status (draft|pending|approved|rejected|cancelled), note

### PayrollRun
code, period_year, period_month, status (draft|locked), locked_at

### PayrollLine
run_id, employee_id, base_salary, ot_minutes, ot_amount, deductions, net_amount, attributes

## Invariants

1. ends_on ≥ starts_on; days > 0
2. Một employee không 2 đơn approved trùng ngày chồng (check mềm NS3 — warn/block đơn giản theo overlap)
3. PayrollRun locked → không sửa lines
4. Unique (tenant, year, month) một run

## Settings hr
`ot_rate_per_hour` default 50000 (VND)
