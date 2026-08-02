# Aggregate Design Blueprint: Production (Sản xuất / MES nhẹ)

> Module catalog: **`san-xuat`**. Ngày: 2026-08-02.  
> Nghiệp vụ: nhà máy MTO/MTS — BOM, lệnh sản xuất, xuất NVL, nhập TP, CTP cho Sales.  
> **Phụ thuộc**: Kho (ATP/NVL/TP). **Trạng thái: ĐÃ DUYỆT thứ tự** — SX1 triển khai kèm ADR-010 (cá nhân hóa).

## 0. Cá nhân hóa (bắt buộc)

Namespace `tenant_settings.production`:
| Key | Default | Ý nghĩa |
|---|---|---|
| `default_fg_warehouse_code` | `KHO-TP` | Kho nhập TP |
| `default_rm_warehouse_code` | `KHO-NVL` | Kho xuất NVL |
| `default_lead_time_days` | `7` | CTP khi thiếu ATP/WO |
| `allow_release_without_rm` | `false` | Cho phép release LSX khi thiếu NVL |
| `over_receipt_pct` | `0` | % nhập TP vượt kế hoạch |
| `auto_create_wo_on_so_shortfall` | `false` | Gợi ý/tạo LSX khi confirm SO thiếu hàng |

BOM/LSX dùng `attributes` JSONB cho field riêng từng nhà máy.

## 1. Name

**Production** — Aggregate roots: `BillOfMaterials`, `Routing` (Phase 2), `WorkOrder`, `MaterialIssue`, `ProductionReceipt`.

## 2. Context

- **Vai trò**: Biến nhu cầu thành phẩm (từ Sales hoặc kế hoạch) thành lịch / lệnh SX; trả **CTP** (Capable-to-Promise) khi thiếu ATP.
- **Ranh giới**: Không giữ tồn (Kho); không tính lương/OEE đầy đủ (Thiết bị/HR sau); không ghi sổ kế toán (chỉ event).

## 3. Properties

### 3.1 BillOfMaterials (Định mức vật tư)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| code | TEXT | Unique/tenant |
| finished_item_id | UUID | Item loại `fg` (Kho) |
| version | INT | |
| status | TEXT | `draft` \| `active` \| `obsolete` |
| lines | bảng con | component_item_id, qty_per, scrap_pct, uom |
| attributes | JSONB | ghi chú công nghệ |

**Invariant**: Chỉ 1 BOM `active` / finished_item (hoặc active theo hiệu lực ngày — Phase 2).

### 3.2 WorkOrder (Lệnh sản xuất)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | |
| code | TEXT | LSX-xxxx |
| finished_item_id | UUID | |
| bom_id | UUID | Snapshot BOM lúc release |
| qty_planned | NUMERIC | > 0 |
| qty_completed | NUMERIC | ≥ 0, ≤ planned (+ over-receipt policy) |
| status | TEXT | `draft` → `released` → `in_progress` → `completed` \| `cancelled` |
| sales_order_id | UUID | null nếu MTS |
| sales_order_item_id | UUID | optional |
| planned_start | DATE | |
| planned_end | DATE | CTP đưa ra |
| warehouse_fg_id | UUID | Nhập TP vào kho nào |
| warehouse_rm_id | UUID | Xuất NVL từ kho nào |
| promise_snapshot | JSONB | Kết quả CTP lúc tạo |
| attributes | JSONB | ca, chuyền, ưu tiên |

### 3.3 MaterialIssue (Xuất vật tư cho LSX)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| work_order_id | UUID | |
| status | TEXT | `draft` \| `posted` |
| lines | component, qty | → Inventory `issue` + reservation consume |

### 3.4 ProductionReceipt (Nhập thành phẩm)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| work_order_id | UUID | |
| qty | NUMERIC | > 0 |
| status | TEXT | `draft` \| `posted` |
| → Inventory `receipt` kho TP; tăng `qty_completed`.

### Dynamic (JSONB)

- Thông số QC đầu/cuối ca; lý do dừng; số máy (link thiet-bi sau).

## 4. Enforced Invariants

1. Không `release` LSX nếu BOM không `active` hoặc thiếu dòng.
2. Không `release` nếu NVL theo BOM * qty_planned không thể cover bởi ATP Kho (trừ policy “cho thiếu — chờ mua”).
3. `qty_completed` chỉ tăng qua ProductionReceipt posted.
4. MaterialIssue posted ≤ nhu cầu BOM còn lại (không xuất vượt định mức trừ scrap cho phép).
5. Cancel LSX `released+`: release reservation NVL chưa consume.
6. CTP: `planned_end` phải ≥ hôm nay; nếu không đủ công suất → status CTP `unavailable` + lý do (không bịa ngày).

## 5. Corrective Policies

- NVL thiếu giữa chừng: LSX → `material_short` (attributes/status phụ); Sales cập nhật promise.
- Nhập TP vượt planned: cho phép % over-receipt cấu hình; phần dư MTS vào kho.
- BOM đổi version: LSX đã release giữ snapshot; LSX draft nhận version mới.

## 6. Domain Events

| Event | Trigger | Consumer |
|---|---|---|
| BomActivated | BOM → active | — |
| WorkOrderReleased | release | Inventory reserve NVL |
| MaterialIssued | post issue | Inventory, Accounting |
| ProductionReceived | post receipt | Inventory FG, Sales ATP, Accounting |
| WorkOrderCompleted | qty_completed ≥ planned | Sales (đủ hàng giao) |
| CtpCalculated | API CTP | Sales promise_check |

## 7. CTP (Capable-to-Promise) — hợp đồng với Sales

Input: `item_id`, `qty`, `need_by?`  
Output: `{ status: available\|unavailable, earliest_date?, open_wo_qty, reason }`

Phase SX1 thuật toán tối thiểu:

1. ATP Kho TP.
2. Cộng `open_wo_qty` = Σ (qty_planned − qty_completed) các LSX released/in_progress cùng item.
3. Nếu vẫn thiếu: ước lượng theo lead_time_days trên Item/BOM (cấu hình) — **không** giả lập máy nếu chưa có module Thiết bị.
4. Ghi vào `sales_orders.promise_check` (thay stub hiện tại).

## 8. Phase triển khai đề xuất

### Phase SX1 (MVP)

- BOM 1 cấp; WorkOrder draft→release→complete; MaterialIssue + ProductionReceipt qua API Kho.
- Adapter CTP thay stub Sales.
- UI: danh sách BOM, LSX, nút “Tạo LSX từ đơn thiếu hàng”.

### Phase SX2

- Routing / công đoạn; đa cấp BOM; lịch theo ca.

### Phase SX3

- Liên kết Thiết bị (OEE); AI forecast → MPS.

## 9. Bảo mật

- RLS + `has_module_access('san-xuat')`.
- Release LSX: role `planner` / admin (map access_level manage).
