# Design Spec — Cài đặt công ty (Tenant Settings Hub)

> 2026-08-02 · Audience: owner/admin tenant · UI: glass Optimake, tab responsive 3 thiết bị.

## 1. Mục tiêu

Mỗi khách hàng có **khu cài đặt riêng**, tách rõ:
- Thông tin gói / module (chỉ đọc hoặc liên hệ Optimake)
- **API AI** (key, model, bật/tắt tính năng AI)
- Tham số theo **module được cấp** (vd Kinh doanh)
- Tích hợp & thông báo

## 2. Cấu trúc tab (thông minh)

| Tab key | Ai thấy | Nhóm việc |
|---|---|---|
| `overview` | mọi user đăng nhập | Công ty, hợp đồng, seats, cây module đã cấp |
| `ai` | owner/admin | Nhà cung cấp LLM, API key (mask), model, bật Copilot / Forecast / NLP stub |
| `sales` | owner/admin **và** có module `kinh-doanh` | Link quy trình duyệt, chiết khấu; tham số: tiền tệ hiển thị, cảnh báo công nợ (ngày), cho phép confirm khi thiếu ATP |
| `integrations` | owner/admin | Webhook outbox URL (n8n), bật/tắt đẩy sự kiện |
| `notifications` | owner/admin | Email nhắc hợp đồng nội bộ, nhắc duyệt báo giá |

Tab module khác (MES, Kho…) chỉ xuất hiện khi được cấp — Phase sau thêm `production`, `inventory`.

## 3. Lưu trữ

Bảng `tenant_settings`:
- `(tenant_id, namespace, key)` unique
- `value` JSONB
- RLS: cùng tenant + authenticated; **ghi** chỉ qua service assert owner/admin

Namespace:
- `ai.*` — provider, api_key (secret), model, features{}
- `sales.*` — currency_label, debt_warning_days, allow_confirm_without_atp
- `integrations.*` — webhook_url, webhook_enabled
- `notifications.*` — email_approval_reminder, email_debt_reminder

## 4. Bảo mật API key

- Chỉ owner/admin đọc/ghi namespace `ai`
- API trả về `api_key_masked` (•••• + 4 ký tự cuối), không trả plaintext
- Update: nếu client gửi chuỗi mask hoặc rỗng → giữ key cũ

## 5. UX

- TabBar glass cuộn ngang (phone)
- Mỗi tab = 1 mục đích; trong tab dùng **nhóm** (card) có tiêu đề + 1 câu mô tả
- Form: label rõ, lỗi dưới field, nút Lưu + spinner, toast/inline success
- Touch ≥ 44px
