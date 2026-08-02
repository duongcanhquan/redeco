# Design: Composable modules + Accounting KT1

> Duyệt 2026-08-02 (user chọn hướng C, approve A+B+C). ADR-010 + **ADR-011**.

## Nguyên tắc

1. Entitlement = có module trong hợp đồng.
2. Capability = cờ trong `tenant_settings` (dùng phần nào).
3. Adapter liên module = optional, fail-soft.
4. Lộ trình Kho→SX→KT = thứ tự build, không bắt buộc bật.

## Accounting capabilities (namespace `accounting`)

| Key | Default | Ý nghĩa |
|---|---|---|
| `ar_enabled` | `true` | Mirror HĐ + phiếu thu từ `sales_outbox` |
| `cogs_enabled` | `false` | Valuation từ phiếu Kho (cần entitle `kho`) |
| `ap_enabled` | `false` | KT2 |
| `default_payment_terms_days` | `30` | `due_on` = issued + N ngày |

## KT1 deliverables

- Tables: `ar_invoices`, `cash_receipts`, `inventory_valuation_entries` (COGS khi bật).
- Consumer outbox: `InvoiceCreated` → AR; `InvoicePaid` → CashReceipt (+ AR paid).
- Không có `ke-toan` / `ar_enabled=false`: outbox không bị consumer; Sales OK.
- UI: `/accounting` hub + tuổi nợ; Cài đặt tab Kế toán.
- Menu chỉ khi entitle `ke-toan`.
