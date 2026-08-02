# Lộ trình module cho công ty sản xuất — Optimake

> Ngày: 2026-08-02. Bám nghiệp vụ nhà máy (MTO/MTS, vật tư → thành phẩm → giao hàng → công nợ).  
> **Đã duyệt thứ tự** (2026-08-02). Đang implement Phase K1 **Kho**; SX/KT chờ xong Kho.

## Chuỗi giá trị nhà máy (mục tiêu)

```
Đơn hàng bán (Sales)
    ↓ thiếu thành phẩm?
Kế hoạch / CTP (Production)
    ↓
Lệnh sản xuất + xuất vật tư (Production ↔ Inventory)
    ↓
Nhập thành phẩm (Inventory)
    ↓
Giao hàng / Hóa đơn (Sales) → Giá vốn / công nợ (Accounting)
```

## Thứ tự đề xuất (bắt buộc theo phụ thuộc)

| # | Module catalog | Blueprint | Vì sao trước |
|---|---|---|---|
| 1 | **`kho`** (mới — tách khỏi Sales) | [inventory](./2026-08-02-inventory-module-blueprint.md) | ATP thật, lô/kho, giữ chỗ vật tư; Sales SP tạm thời migrate sang đây |
| 2 | **`san-xuat`** | [production](./2026-08-02-production-module-blueprint.md) | BOM, LSX, CTP; cần tồn Kho để xuất NVL / nhập TP |
| 3 | **`ke-toan`** | [accounting](./2026-08-02-accounting-module-blueprint.md) | Consume `sales_outbox` + phiếu kho → công nợ / giá vốn |
| 4 | `thiet-bi` | (sau) | Máy · OEE · bảo trì — phụ thuộc lịch SX |
| 5 | `nhan-su` / `hanh-chinh` | (sau) | Hỗ trợ vận hành, không chặn O2C nhà máy |

## Nguyên tắc chốt với người dùng

1. **Một nguồn tồn**: Sau Phase Kho, Sales không còn “kho tạm” — chỉ đọc ATP qua API Kho.
2. **MTO ưu tiên**: Đơn bán thiếu hàng → gợi ý / tạo LSX (không bịa ngày CTP nếu chưa có năng lực).
3. **RLS + module entitlement** giống Sales (`has_module_access`).
4. **JSONB `attributes`** cho trường riêng từng nhà máy (mác thép, ca SX…).
5. **Cá nhân hóa theo công ty (ADR-010)**: mọi tham số vận hành + quy trình (kho mặc định, lead time CTP, cho phép release thiếu NVL, duyệt…) cấu hình per-tenant qua `tenant_settings` / bảng workflow — không một quy trình cứng cho mọi khách.
6. **Composable (ADR-011)**: lộ trình Kho→SX→KT là thứ tự *xây*, không bắt buộc *bật*. Công ty có thể không dùng / dùng một phần / ghép công đoạn qua entitlement + capability flags + adapter fail-soft.

## Cách duyệt

- Duyệt **từng** Blueprint (đề xuất bắt đầu bằng **Kho**).
- Sau duyệt → plan implement → migration + UI.
- Không viết code module mới trước khi Blueprint được xác nhận.
