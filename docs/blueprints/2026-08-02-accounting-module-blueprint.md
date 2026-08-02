# Aggregate Design Blueprint: Accounting (Kế toán vận hành nhà máy)

> Module catalog: **`ke-toan`**. Ngày: 2026-08-02.  
> **ADR-010**: tham số sổ/kỳ/hạch toán mặc định per-tenant qua `tenant_settings.accounting` + `attributes` — không một quy trình cứng cho mọi công ty.  
> Nghiệp vụ: công nợ phải thu/trả, ghi nhận doanh thu từ Sales, giá vốn từ phiếu kho/SX — **không** thay thế phần mềm kế toán thuế đầy đủ ở Phase 1.  
> **Phụ thuộc mềm**: Sales outbox (AR); Kho (COGS — optional). **Trạng thái: ĐÃ DUYỆT + KT1** (ADR-011 composable).

## 0. Capabilities (bắt buộc — ADR-011)

| Key | Default | Khi tắt |
|---|---|---|
| `ar_enabled` | `true` | Không consume outbox → AR |
| `cogs_enabled` | `false` | Không đọc phiếu Kho → valuation |
| `ap_enabled` | `false` | KT2 |
| `default_payment_terms_days` | `30` | — |

Thiếu module `ke-toan`: Sales vẫn ghi outbox; không consumer.

## 1. Name

**Accounting** — Aggregate roots Phase 1: `ArInvoiceMirror`, `CashReceipt`, `ApBill` (nhẹ), `InventoryValuationEntry` (bút toán kho).

## 2. Context

- **Vai trò**: Gương phản chiếu chứng từ bán hàng & kho thành sổ công nợ / giá vốn nội bộ để giám đốc nhà máy thấy P&L vận hành.
- **Ranh giới**: Không thay thế quyết toán thuế GTGT đầy đủ; không payroll (HR). Có thể export sang phần mềm kế toán ngoài qua outbox.

## 3. Properties

### 3.1 ArInvoiceMirror (Công nợ phải thu — đồng bộ từ Sales)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| tenant_id | UUID | |
| source_invoice_id | UUID | FK logic tới `invoices` Sales |
| customer_id | UUID | |
| code | TEXT | Copy mã HĐ |
| amount | NUMERIC | |
| status | TEXT | `open` \| `partial` \| `paid` \| `void` |
| issued_on | DATE | |
| due_on | DATE | issued_on + payment_terms (attributes khách) |
| attributes | JSONB | |

### 3.2 CashReceipt (Phiếu thu)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| tenant_id | UUID | |
| ar_invoice_id | UUID | |
| amount | NUMERIC | > 0 |
| received_on | DATE | |
| method | TEXT | `transfer` \| `cash` \| `other` |

**Policy**: Sales `markInvoicePaid` → tạo CashReceipt full (Phase 1 1-1); Phase 2 partial.

### 3.3 InventoryValuationEntry (Giá vốn / biến động kho)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| tenant_id | UUID | |
| source_type | TEXT | `inventory_txn` \| `production_receipt` |
| source_id | UUID | |
| item_id | UUID | |
| qty | NUMERIC | |
| unit_cost | NUMERIC | Bình quân / chuẩn (cấu hình) |
| amount | NUMERIC | |
| posted_at | TIMESTAMPTZ | |

### 3.4 ApBill (Phase KT1 nhẹ — công nợ phải trả mua NVL)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| vendor_name | TEXT | Phase 1 chưa Vendor aggregate đầy đủ |
| amount | NUMERIC | |
| status | TEXT | `open` \| `paid` |
| linked_receipt_id | UUID | Phiếu nhập Kho |

### Dynamic

- Tài khoản kế toán mapping (JSON) cho export; trung tâm chi phí = chuyền SX.

## 4. Enforced Invariants

1. Tổng CashReceipt ≤ amount ArInvoice; paid chỉ khi đủ.
2. Không double-consume cùng `source_invoice_id`.
3. Valuation entry bất biến sau post; void tạo entry đảo.
4. Mọi bút toán gắn `tenant_id` từ JWT — không nhận từ client.

## 5. Corrective Policies

- Sales outbox event fail: retry + dead-letter; dashboard “chứng từ chưa vào sổ”.
- Lệch giá vốn (đổi cost method): adjustment entry + ghi chú kỳ.

## 6. Domain Events

| Event | Trigger | Consumer |
|---|---|---|
| ArOpened | Mirror HĐ unpaid | Dashboard KT |
| ArPaid | CashReceipt đủ | Sales sync nếu cần |
| CogsPosted | Valuation từ xuất TP/NVL | P&L |
| ApOpened | Bill từ nhập mua | — |

## 7. Phase triển khai đề xuất

### Phase KT1

- Consumer `sales_outbox`: `InvoiceCreated` → ArInvoiceMirror; `InvoicePaid` → CashReceipt.
- UI: sổ công nợ KH, tuổi nợ (dùng `due_on` / debtWarningDays).
- Đọc valuation stub từ phiếu Kho (cost = base hoặc chuẩn).

### Phase KT2

- ApBill + Vendor; P&L đơn giản theo tháng; export CSV.

### Phase KT3

- Kết nối phần mềm kế toán ngoài; phân bổ chi phí SX.

## 8. Bảo mật

- RLS + `has_module_access('ke-toan')`.
- Member sales không sửa sổ KT; chỉ đọc công nợ khách trên CRM nếu được gán.
