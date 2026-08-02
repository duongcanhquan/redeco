# Design Spec — Hub Setup Kinh doanh + Icon menu

> 2026-08-02 · Đã duyệt (brainstorm): profile **C**, phạm vi **3**, vị trí **A**, hướng **1**.

## 1. Mục tiêu

- Icon Lucide riêng cho từng mục menu/tab hub (sidebar + HubTabBar).
- Nâng **Cài đặt → Kinh doanh** thành hub setup đa panel + checklist + preset hệ thống + profile công ty.
- Dễ setup lần đầu, dễ sửa sau, rà soát mâu thuẫn thông minh.

## 2. Điều hướng URL

- Tab: `/{slug}/settings?tab=sales&panel=<key>`
- Panel: `overview` | `docs` | `stock` | `approval` | `discount` | `delivery` | `profiles`
- Mặc định `panel=overview`.

## 3. Lưu trữ (`tenant_settings` namespace `sales`)

| Key | Value |
|---|---|
| (các key chứng từ hiện có) | giữ nguyên |
| `setup_flags` | `{ skipApproval, skipDiscountRules, ackDeliveryInvoice }` |
| `profiles` | mảng profile công ty (max 20) |
| `active_profile_id` | `preset:b2c` \| `preset:b2b` \| `preset:agency` \| `profile:<uuid>` \| null |

Snapshot profile v1: tham số KD + 2 cờ inventory reserve + setup_flags liên quan. **Không** nhúng workflow/CK rows.

Khi áp profile: ghi `sales.*` + `inventory.reserve_on_so_confirm` / `require_full_reserve_on_confirm`.

## 4. Checklist & cảnh báo

Xem design chat (6 mục + banner vàng mâu thuẫn). Chỉ owner/admin ghi.

## 5. Icon menu

Map key → Lucide (Tong quan, KH, SP, BG, ĐH, GH, HĐ, CK, Duyệt; Kho/SX tương tự). Sidebar con dùng icon thật, không ChevronRight.
