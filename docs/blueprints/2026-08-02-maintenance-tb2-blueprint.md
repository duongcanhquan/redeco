# Aggregate Design Blueprint: Maintenance — Phase TB2

> Module: **`thiet-bi`**. Ngày: 2026-08-02.  
> Slice: phụ tùng XK từ Kho + đồng bộ `equipment.status` theo vòng đời lệnh BT.  
> **Trạng thái: triển khai theo yêu cầu «làm tiếp» sau TB1.**

## Scope TB2

**Trong**
- `eam_maintenance_part_lines` — kế hoạch / đã xuất phụ tùng trên lệnh BT
- Xuất kho (`issue`) qua `postInventoryTxn` khi manager xác nhận xuất phụ tùng
- RLS bridge `thiet-bi` ↔ bảng Kho (giống SX)
- Khi lệnh → `in_progress`: thiết bị → `down` (lưu status cũ trong `attributes.prev_equipment_status`)
- Khi `completed` / `cancelled`: khôi phục status thiết bị

**Ngoài**
- IoT / PdM / OEE / AI ask
- Đặt hàng mua phụ tùng (Purchasing)
- Serial phụ tùng

## Invariants

1. Chỉ xuất phụ tùng khi lệnh `released` | `in_progress`.
2. Không xuất vượt `qty_planned` còn lại trên dòng.
3. Idempotent: dòng `issued` không xuất lại.
4. Thiếu tồn → lỗi từ Kho (không âm trừ policy Kho).
