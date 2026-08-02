# Aggregate Design Blueprint: Inventory (Kho)

> Module catalog đề xuất: **`kho`** (root mới). Ngày: 2026-08-02.  
> Nghiệp vụ: công ty sản xuất — quản lý vật tư / bán thành phẩm / thành phẩm, ATP, giữ chỗ cho đơn bán & lệnh SX.  
> **Trạng thái: ĐÃ DUYỆT + K1 ĐÃ TRIỂN KHAI** (2026-08-02). Phase K2/K3 chưa làm.

## 1. Name

**Inventory** (Bounded Context) — Aggregate roots chính: `Warehouse`, `Item`, `StockBalance`, `StockReservation`, `InventoryTransaction` (Receipt / Issue / Transfer / Adjustment).

## 2. Context

- **Vai trò**: Nguồn sự thật duy nhất về tồn kho vật lý và khả dụng (ATP) cho Sales + Production.
- **Ranh giới**: Không chứa BOM/routing (Production); không tính giá vốn sổ sách (Accounting đọc phiếu kho).
- **Migrate từ Sales**: `products` + `product_stock` hiện tại → `items` + `stock_balances` (Phase 1 Kho giữ tương thích view/API cho Sales).

## 3. Properties

### 3.1 Warehouse (Kho vật lý)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | RLS |
| code | TEXT | Unique/tenant (VD: KHO-NVL, KHO-TP) |
| name | TEXT | |
| kind | TEXT | `raw` \| `wip` \| `fg` \| `spare` \| `other` |
| is_active | BOOLEAN | |
| attributes | JSONB | địa chỉ, thủ kho… |

### 3.2 Item (Danh mục hàng — thay Product tạm của Sales)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| sku | TEXT | Unique/tenant |
| name | TEXT | |
| uom | TEXT | ĐVT chuẩn |
| item_type | TEXT | `raw` \| `wip` \| `fg` \| `consumable` \| `tool` |
| base_price | NUMERIC | Giá bán gợi ý (fg) — Sales đọc |
| is_active | BOOLEAN | |
| attributes | JSONB | mác, kích thước, nhà cung cấp ưu tiên… |

### 3.3 StockBalance (Tồn theo kho)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| warehouse_id | UUID | FK |
| item_id | UUID | FK |
| qty_on_hand | NUMERIC | ≥ 0 |
| qty_reserved | NUMERIC | ≥ 0, ≤ on_hand |
| updated_at | TIMESTAMPTZ | |

**ATP** = `qty_on_hand - qty_reserved` (+ tùy chọn lô hết hạn sau).

### 3.4 StockReservation (Giữ chỗ)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| item_id | UUID | |
| warehouse_id | UUID | |
| qty | NUMERIC | > 0 |
| source_type | TEXT | `sales_order` \| `work_order` |
| source_id | UUID | |
| status | TEXT | `active` \| `released` \| `consumed` \| `cancelled` |
| expires_at | TIMESTAMPTZ | null = không hết hạn |

### 3.5 InventoryTransaction (Phiếu kho)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| code | TEXT | Unique/tenant (NK-/XK-/CK-/ĐC-) |
| txn_type | TEXT | `receipt` \| `issue` \| `transfer` \| `adjustment` |
| status | TEXT | `draft` \| `posted` \| `void` |
| warehouse_id | UUID | Kho chính |
| warehouse_to_id | UUID | null trừ transfer |
| posted_at | TIMESTAMPTZ | |
| lines | JSONB hoặc bảng con | item, qty, lot?, ref |

### Dynamic (JSONB)

- Lot/serial policy per item; vị trí kệ; QC hold flags.

## 4. Enforced Invariants

1. `qty_on_hand ≥ 0`; `qty_reserved ≥ 0`; `qty_reserved ≤ qty_on_hand`.
2. Không `post` phiếu `issue` nếu ATP (sau reserve khác) không đủ — trừ adjustment có lý do `force` (chỉ owner).
3. Reservation `active` phải cộng vào `qty_reserved`; cancel/release trừ đúng.
4. Phiếu `posted` bất biến — chỉ `void` tạo bút toán đảo.
5. Item `fg` mới được Sales bán (map từ product hiện tại).

## 5. Corrective Policies

- Sau kiểm kê lệch: tạo `adjustment` + event `StockAdjusted`; nếu âm tạm thời → khóa xuất + cảnh báo.
- Reservation hết `expires_at`: job hủy → trả ATP (Sales/Production nhận event).
- Khi void phiếu đã ảnh hưởng LSX: Production đánh dấu `material_short`.

## 6. Domain Events

| Event | Trigger | Consumer |
|---|---|---|
| StockReceived | Post receipt | Accounting (giá vốn), Production |
| StockIssued | Post issue | Accounting, Production |
| StockReserved | Tạo reservation | Sales ATP refresh |
| StockReservationReleased | Hủy/hết hạn | Sales / Production |
| StockTransferred | Post transfer | — |
| StockAdjusted | Post adjustment | Accounting |

## 7. Phase triển khai đề xuất

### Phase K1 (MVP nhà máy)

- Warehouse + Item + StockBalance; migrate product_stock → 1 kho TP mặc định.
- Receipt / Issue đơn giản; API `getAtp(itemId)` cho Sales confirm.
- Reservation từ SalesOrder khi confirm (tuỳ chọn setting).

### Phase K2

- Transfer giữa kho NVL/TP; lot cơ bản; reservation từ WorkOrder.

### Phase K3

- Kiểm kê, min-max reorder, barcode.

## 8. Tích hợp Sales (đã có)

- Thay `product_stock.qty_on_hand` bằng ATP từ Kho.
- `decrement_stock` khi giao hàng → `issue` từ kho TP (posted).

## 9. Bảo mật

- RLS: `tenant_id` + `has_module_access('kho')`.
- Post/void phiếu: owner/admin hoặc role `warehouse`.

## 10. Cá nhân hóa (ADR-010)

Namespace `tenant_settings.inventory`:
| Key | Default | Ý nghĩa |
|---|---|---|
| `default_fg_warehouse_code` | `KHO-TP` | Kho TP khi sync / xuất giao hàng |
| `default_rm_warehouse_code` | `KHO-NVL` | Kho NVL |
| `low_stock_threshold` | `5` | Ngưỡng cảnh báo ATP trên hub |
| `reserve_on_so_confirm` | `false` | Giữ chỗ khi xác nhận đơn bán (K2) |
