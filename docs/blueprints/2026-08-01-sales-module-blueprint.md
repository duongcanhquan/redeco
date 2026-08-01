# Aggregate Design Blueprint — Module Kinh doanh (`kinh-doanh`)

> Theo `ddd-blueprint.mdc`. Phase 1 = Order-to-Cash core. Ngày: 2026-08-01.

## Phạm vi Phase 1 (triển khai ngay)

Khách hàng (CRM cơ bản) → Báo giá (duyệt) → Đơn hàng (credit check + ATP) → Giao hàng (trừ tồn) → Hóa đơn (công nợ). Kèm Sản phẩm + tồn kho thành phẩm tối thiểu (chủ sở hữu tương lai: module Kho).

## Aggregates

### 1. Customer (Khách hàng)
- **Context**: Sales. **Root**: `customers`.
- **Properties**: code (unique/tenant), name, kind (`b2b`|`b2c`|`dai-ly`), tax_code, contact (phone/email/address trong attributes), credit_limit (null = không giới hạn), status (`active`|`inactive`).
- **Invariants**:
  - Công nợ hiện tại = tổng hóa đơn `unpaid` (derived, không lưu).
  - credit_limit ≥ 0 nếu có.
- **Policies**: Đơn hàng chỉ được xác nhận khi (công nợ + giá trị đơn) ≤ credit_limit (nếu có).
- **Domain Events**: `CustomerCreated`, `CustomerCreditLimitChanged`.

### 2. Product (Sản phẩm) + Stock
- **Context**: Sales (tạm — sẽ chuyển chủ quyền sang module Kho/Kỹ thuật).
- **Properties**: sku (unique/tenant), name, uom, base_price ≥ 0, is_active; `product_stock.qty_on_hand` ≥ 0.
- **Invariants**: không xuất kho quá tồn (`qty_on_hand` không âm).
- **Domain Events**: `StockDecreased(delivery)`.

### 3. Quotation (Báo giá)
- **Root**: `quotations`, con: `quotation_items`.
- **Properties**: code, customer_id, status (`draft`→`sent`→`approved`|`rejected`; `approved`→`converted`), valid_until, discount_pct (0–100), items[{product, qty>0, unit_price≥0, discount_pct}], total (derived, lưu snapshot).
- **Invariants**: chỉ sửa items khi `draft`; duyệt/từ chối chỉ bởi owner/admin của tenant (phê duyệt 1 cấp — nhiều cấp ở Phase 2); `converted` chỉ từ `approved`.
- **Domain Events**: `QuotationSent`, `QuotationApproved`, `QuotationConverted`.

### 4. SalesOrder (Đơn đặt hàng)
- **Root**: `sales_orders`, con: `sales_order_items`.
- **Properties**: code, customer_id, quotation_id?, status (`draft`→`confirmed`→`delivering`→`completed`; hủy từ draft/confirmed), expected_delivery_date, total, credit_check (jsonb snapshot: passed, outstanding, limit), items như báo giá + `atp_qty` snapshot lúc xác nhận.
- **Invariants**:
  - **Credit check** (bắt buộc khi confirm): outstanding(unpaid invoices) + total ≤ credit_limit (bỏ qua nếu limit null). Fail → không confirm được.
  - **ATP**: mỗi item so `qty` với `qty_on_hand`; kết quả hiển thị + lưu snapshot (thiếu hàng vẫn cho confirm nếu người dùng chấp nhận giao sau — Phase 1; CTP cần module Sản xuất → Phase 2).
- **Domain Events**: `SalesOrderConfirmed`, `SalesOrderCancelled`.

### 5. DeliveryNote (Lệnh giao hàng) & Invoice (Hóa đơn)
- **DeliveryNote**: code, sales_order_id, status (`pending`→`shipped`), shipped_at. Khi `shipped`: trừ `product_stock` từng dòng (không âm), SO → `delivering`/`completed`.
- **Invoice**: code, sales_order_id, customer_id, total, status (`unpaid`→`paid`), paid_at. Sinh từ SO đã giao. Công nợ khách = Σ unpaid.
- **Domain Events**: `DeliveryShipped`, `InvoicePaid` (Phase 2: đẩy sang module Kế toán).

## Bảo mật & truy cập
- RLS mọi bảng: `tenant_id = current_tenant_id()` **và** tenant có entitlement module `kinh-doanh` (helper `has_module_access('kinh-doanh')` dựa `tenant_entitled_module_ids`).
- Phê duyệt báo giá / xác nhận đơn: kiểm tra role owner/admin ở service layer (member được tạo draft).
- Superadmin không có quyền đọc dữ liệu nghiệp vụ tenant (không thêm policy platform).

## Roadmap các nhóm còn lại
- **Nhóm 2** (CPQ+BOM động, Dynamic Pricing, AI Forecasting, B2B Portal+EDI, Profitability): cần module Kỹ thuật (BOM), Kho, Sản xuất, Kế toán + data pipeline → sau khi Phase 1 chạy và các module nền ra đời. B2B Portal dùng lại subdomain + role mới `customer`.
- **Nhóm 3** (Churn scoring, Next Best Action, ERP Copilot): cần ≥ vài tháng dữ liệu giao dịch; Copilot đọc qua các hàm SQL/views đã chuẩn hóa từ Phase 1 (thiết kế bảng đã tính trước: mọi giao dịch có timestamps + attributes JSONB).
- **Nhóm 4** (n8n): bảng `webhook_endpoints`/platform_settings + gọi webhook khi có Domain Events (QuotationSent, SalesOrderConfirmed...) — Phase 2, cần n8n instance của doanh nghiệp.
- **Nhóm 5**: theo yêu cầu riêng từng doanh nghiệp, phát triển sau.
