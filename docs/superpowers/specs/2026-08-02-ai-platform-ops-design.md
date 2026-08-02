# Design Spec — AI Platform Ops + Multi-module Assistants (v1)

> 2026-08-02 · Duyệt ngầm qua chỉ đạo «tiếp tục triển khai» · hướng **A→B**.

## 1. Mục tiêu

Đưa AI từ «chỉ Kinh doanh» thành **nền tảng vận hành** có:

1. Audit/usage thật trong DB + hạn mức tenant
2. Test kết nối provider
3. Hub `/ai` (trạng thái, checklist setup, usage)
4. Catalog + feature toggles + hỏi đáp snapshot cho **Kho / SX / Nhân sự** (cùng pattern Sales)

**Ngoài scope v1:** RAG/pgvector, Nest worker, encrypt key vault, forecast/churn runtime.

## 2. Kiến trúc

```
Entitlement (ai / ai.<module>.*) → tenant_settings.ai (provider+key+features)
  → callTenantLlm + log ai_usage_logs → UI hub/module panels
```

## 3. Schema

`ai_usage_logs`: tenant_id, user_id, feature_key, module_key, ok, latency_ms, error_code, meta jsonb, created_at. RLS tenant isolation. Index (tenant_id, created_at).

`tenant_settings.ai.features` mở rộng: `inventoryAsk`, `productionAsk`, `hrAsk` (+ giữ Sales flags).

## 4. Catalog modules

```
ai
├── ai.kinh-doanh (đã có)
├── ai.kho → ai.kho.hoi-dap
├── ai.san-xuat → ai.san-xuat.hoi-dap
└── ai.nhan-su → ai.nhan-su.hoi-dap
```

## 5. Runtime features

| Feature | Snapshot | UI |
|---|---|---|
| Kho hỏi đáp | warehouses, ATP thấp, phiếu gần đây | Hub kho + `/ai` |
| SX hỏi đáp | LSX mở, BOM thiếu | Hub SX + `/ai` |
| HR hỏi đáp | NV active, HĐ sắp hết, chấm công gần đây | Hub HR + `/ai` |
| Test connection | «ping» 1 câu ngắn | Settings AI |

## 6. Bảo mật / hạn mức

- Key server-only; prompt cấm bịa số ngoài snapshot
- Rate: 20/user/giờ (DB count thay Map) + soft cap 200/tenant/ngày (settings)
- Timeout 30s; log mọi lần gọi

## 7. Success criteria

- Admin test được key; thấy usage trên `/ai`
- Member entitled hỏi được AI Kho/SX/HR khi bật feature
- Typecheck pass; migration applied
