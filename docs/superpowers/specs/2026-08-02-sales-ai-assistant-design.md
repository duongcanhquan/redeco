# Design Spec — Trợ lý AI Kinh doanh (v1)

> 2026-08-02 · Duyệt: phạm vi **A** (hub KD) · AI gắn **từng module** · hướng snapshot + LLM server-side.

## 1. Mục tiêu

Panel hỏi–đáp trên `/sales`: tóm tắt / trả lời thắc mắc từ **snapshot dữ liệu KD** của đúng tenant. Không ghi/sửa chứng từ.

## 2. Điều kiện hiện panel

- Entitled `kinh-doanh`
- `tenant_settings.ai`: có API key + `features.copilot === true`
- Thiếu cấu hình → CTA sang Cài đặt → AI

## 3. Luồng

Client → Server Action `askSalesAssistant(question)` → assert session/tenant → load AI settings → build snapshot → `callTenantLlm` → trả lời tiếng Việt.

## 4. Snapshot

KPI, hàng đợi (~10), pipeline/phễu đếm, currencyLabel, debtWarningDays. Không gửi key xuống client; không dump full bảng.

## 5. Bảo mật

Key chỉ server; system prompt cấm bịa số; rate ~20/user/giờ; timeout 30s. Pattern tái dùng cho Kho/SX sau.

## 6. UX

Nút «Hỏi AI» trên hub; sheet/drawer; 3–4 câu gợi ý; loading/error; responsive phone/tablet/desktop.
