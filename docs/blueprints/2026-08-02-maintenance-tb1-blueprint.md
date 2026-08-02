# Aggregate Design Blueprint: Maintenance / EAM — Phase TB1 (Core)

> Module catalog: **`thiet-bi`**. Ngày: 2026-08-02.  
> Slice: **A — TB1 Core** (Equipment hierarchy, Work Request, Maintenance Order + tasks, Preventive Plan + PM engine).  
> **Trạng thái: ĐÃ DUYỆT (user: triển khai bảo trì) + đang triển khai.**

## 0. Scope TB1

**Trong scope**

- Cây thiết bị (`Equipment`: nhà máy → line → máy → công cụ)
- Yêu cầu bảo trì (`WorkRequest`) từ hiện trường
- Lệnh bảo trì (`MaintenanceOrder`) + checklist tasks
- Kế hoạch bảo trì định kỳ (`MaintenancePlan`) + `PreventiveMaintenanceEngine` sinh lệnh khi đến hạn
- Hub UI `/{slug}/equipment` (tổng quan, thiết bị, yêu cầu, lệnh BT, kế hoạch PM)
- RLS `has_module_access('thiet-bi')`; entitle demo
- `tenant_settings.maintenance` tối thiểu (prefix mã)

**Ngoài scope TB1**

- IoT / sensor / PdM đầy đủ, Digital Twin 3D
- Kho phụ tùng + trừ tồn khi BT (link Kho pha sau)
- RAG Copilot / computer vision
- Lịch kỹ thuật viên đầy đủ (roster HR)
- OEE realtime từ máy

## 1. Name

**Maintenance** (Bounded Context EAM/CMMS nhẹ) — Aggregate roots TB1:  
`Equipment`, `WorkRequest`, `MaintenanceOrder`, `MaintenancePlan`.

## 2. Context

- **Vai trò**: SSOT máy móc + vòng đời bảo trì sửa chữa / định kỳ; nền cho OEE / downtime SX sau này.
- **Ranh giới**: Không giữ tồn kho phụ tùng (Kho); không tính khấu hao (Kế toán); không thay HR chấm công thợ.

## 3. Properties

### 3.1 Equipment

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | RLS |
| parent_id | UUID \| null | Cây tự tham chiếu |
| code | TEXT | Unique/tenant |
| name | TEXT | |
| kind | TEXT | `plant` \| `line` \| `machine` \| `tool` \| `other` |
| status | TEXT | `draft` \| `active` \| `idle` \| `down` \| `retired` |
| criticality | TEXT | `low` \| `medium` \| `high` \| `critical` |
| location_text | TEXT | |
| installed_on | DATE \| null | |
| attributes | JSONB | serial, model, maker… |

### 3.2 WorkRequest

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| equipment_id | UUID | |
| code | TEXT | YC-xxxx |
| title | TEXT | |
| description | TEXT | |
| priority | TEXT | `low` \| `medium` \| `high` \| `urgent` |
| status | TEXT | `open` \| `approved` \| `rejected` \| `converted` \| `cancelled` |
| reported_on | DATE | |
| maintenance_order_id | UUID \| null | Khi đã tạo lệnh |

### 3.3 MaintenanceOrder (+ tasks)

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| equipment_id | UUID | |
| work_request_id | UUID \| null | |
| plan_id | UUID \| null | Sinh từ PM |
| kind | TEXT | `corrective` \| `preventive` \| `inspection` |
| status | TEXT | `draft` → `released` → `in_progress` → `completed` \| `cancelled` |
| priority | TEXT | |
| scheduled_on | DATE \| null | |
| downtime_minutes | INT | ≥ 0 |
| tasks | bảng con | title, is_done, sort_order |

### 3.4 MaintenancePlan

| Property | Type | Ghi chú |
|---|---|---|
| id | UUID | |
| equipment_id | UUID | |
| code / name | TEXT | |
| interval_days | INT | > 0 |
| next_due_on | DATE | |
| is_active | BOOLEAN | |
| checklist | JSONB | mảng title task khi sinh lệnh |

## 4. Enforced Invariants

1. Equipment không tạo chu trình `parent_id`.
2. Chỉ 1 WR `open`/`approved` trùng equipment+title cùng ngày không bắt buộc — soft.
3. Convert WR → tạo MO corrective; WR → `converted`.
4. Complete MO: mọi task bắt buộc xong (hoặc cho phép skip nếu `attributes.allow_incomplete`).
5. PM engine: plan active + `next_due_on ≤ asOf` → sinh MO preventive + đẩy `next_due_on += interval` (catch-up tối đa N lần/run).

## 5. Domain Events (logical)

| Event | Trigger | Consumer sau |
|---|---|---|
| EquipmentStatusChanged | status → down/active | Production downtime |
| WorkRequestConverted | convert | — |
| MaintenanceOrderCompleted | complete | Accounting / OEE |
| PmOrdersGenerated | PM run | Notify planner |

## 6. Phase sau (TB2+)

- Spare parts issue từ Kho; PdM thresholds; AI ask `ai.thiet-bi`; liên kết downtime LSX.
