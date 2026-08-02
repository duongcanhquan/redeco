# Aggregate Design Blueprint: Inventory K2+K3 (Location + Lot + Quant)

**Ngày:** 2026-08-02  
**Approach:** StockQuant theo (warehouse, location, item, lot) — đã duyệt.  
**Trạng thái:** Đã triển khai (migration apply + service + UI) — 2026-08-02.

## Scope

- Location hierarchy dưới Warehouse (Zone → Row/Rack → Level → Bin)
- `inventory_lots` + item `track_lot`
- `stock_quants` tồn chi tiết; `stock_balances` = rollup ATP
- Dòng phiếu: `location_id`, `lot_id`
- Allocate FIFO/FEFO khi issue
- UI: cấu trúc kho, tồn Bin/Lot, phiếu hỗ trợ lot/bin

**Ngoài scope:** QC, PO typed, Serial, UoM đa cấp, AI, cycle count.

## Aggregates mới

| Name | Context |
|---|---|
| WarehouseLocation | Zone…Bin, tags JSONB, warehouse_id |
| InventoryLot | lot_code, item_id, expiry, received_at |
| StockQuant | qty per warehouse+location+item+lot |

## Invariants

1. Quant qty ≥ 0; sum(quants) = stock_balances.on_hand (rollup)
2. Issue không vượt ATP quant theo chiến lược
3. Item track_lot=true → post receipt/issue bắt buộc lot_id
4. Location thuộc đúng warehouse của phiếu

## Events

StockQuantMoved, LotReceived, AllocationSuggested (internal)
