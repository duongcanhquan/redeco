# Design Spec — Module Kinh doanh Core Phase 2

> Ngày: 2026-08-02 · Bounded Context: Sales (`kinh-doanh`)  
> Quyết định brainstorming: **A** (siết Core trước) · Duyệt báo giá **B** (N cấp cấu hình tenant) · Triển khai **vertical slice**.

## 1. Mục tiêu

Siết nhóm **Must-have Order-to-Cash** cho đủ và đúng invariant, tạo nền cho Advanced/AI sau này — **không** triển khai CPQ, Dynamic Pricing, B2B Portal, NLP, Churn/NBA/Copilot trong phase này.

## 2. Phạm vi

| # | Tính năng | Hành vi |
|---|---|---|
| 1 | CRM lịch sử | Timeline giao dịch theo khách: BG / ĐH / GH / HĐ / thanh toán + công nợ + credit |
| 2 | Quy tắc chiết khấu/KM | Bảng rule theo tenant; match theo kind/KH/min tổng/thời hạn; áp khi tạo BG |
| 3 | Duyệt báo giá N cấp | Workflow + steps (role/user + ngưỡng tiền); nhật ký từng bước |
| 4 | SO credit | Giữ Phase 1; lưu snapshot đầy đủ |
| 5 | ATP + CTP stub | ATP = tồn TP (+ `open_wo_qty` interface = 0 tạm); CTP stub khi thiếu hàng |
| 6 | Outbox kế toán | Ghi sự kiện `InvoiceCreated` / `InvoicePaid` / `DeliveryShipped` |

## 3. Aggregates mới / mở rộng

### 3.1 DiscountRule
- Bảng `discount_rules`: name, priority, is_active, valid_from/until, discount_pct, conditions JSONB  
  `{ customer_kinds?: [], customer_ids?: [], min_doc_total?: number, product_ids?: [] }`
- Invariant: `0 ≤ discount_pct ≤ 100`; chỉ 1 rule “thắng” theo priority cao nhất trong các rule match.
- Event: `DiscountRuleApplied` (ghi `quotations.applied_discount_rule_id`).

### 3.2 ApprovalWorkflow (+ Steps)
- `approval_workflows`: name, entity_type=`quotation`, is_default, is_active
- `approval_workflow_steps`: step_order, name, min_amount (≥0), assignee_role (`owner`|`admin`|`member`) **hoặc** assignee_user_id
- Khi gửi duyệt: chọn workflow default; lọc steps có `min_amount ≤ total` (luôn gồm step có min_amount=0); tạo `quotation_approval_actions` pending cho bước 1.
- Invariant: không skip bước; reject bất kỳ bước → `rejected`; bước cuối approve → `approved`.
- Owner được duyệt mọi bước (override vận hành).

### 3.3 Quotation (mở rộng)
- Thêm: `approval_workflow_id`, `current_step_order`, `applied_discount_rule_id`
- Status giữ: `draft` → `sent` (đang trong chuỗi duyệt) → `approved`|`rejected` → `converted`

### 3.4 SalesOrder (mở rộng)
- `promise_check` JSONB: `{ lines: [{ product_id, qty, atp_qty, open_wo_qty, shortfall, ctp_status, earliest_date, reason }] }`
- CTP stub: nếu shortfall>0 → `ctp_status=unavailable`, `reason=Chưa kết nối module Sản xuất`, `earliest_date=null` (adapter sau).

### 3.5 SalesOutbox
- `sales_outbox`: event_type, aggregate_type, aggregate_id, payload, created_at, published_at null
- Consumer Kế toán Phase sau; Core chỉ ghi outbox trong cùng transaction logic service.

## 4. Bảo mật

- RLS mọi bảng mới: `(select current_tenant_id())` + `(select has_module_access('kinh-doanh'))` (InitPlan).
- Cấu hình workflow/discount: chỉ `owner`|`admin`.
- Duyệt bước: đúng assignee **hoặc** owner.

## 5. UI (tenant workspace, dưới `/{slug}/…`)

- `/sales/customers/[id]` — chi tiết + timeline
- `/sales/discount-rules` — CRUD rule (manager)
- `/sales/approvals` — cấu hình workflow N cấp (manager)
- Báo giá: nút Duyệt/Từ chối theo bước hiện tại + badge “Bước k/n”
- Đơn hàng: modal confirm hiện ATP + CTP stub

## 6. Roadmap ngoài scope (giữ)

Nhóm 2 Advanced · Nhóm 3 AI Workflow · Nhóm 4 AI Revenue — xem blueprint cập nhật.

## 7. Tiêu chí xong

- [ ] Migration apply + RLS
- [ ] Domain pure functions + unit-level logic
- [ ] Smoke test O2C mở rộng (discount apply, multi-step approve, CTP stub, outbox)
- [ ] typecheck / lint / build sạch
