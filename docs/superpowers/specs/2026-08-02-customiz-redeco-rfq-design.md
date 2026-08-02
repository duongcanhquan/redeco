# Design: Customiz · Kinh doanh · Gói REDECO RFQ (Phase 1)

**Ngày:** 2026-08-02  
**Trạng thái:** Chờ duyệt spec (brainstorm đã chốt A–C + 3 phần thiết kế)  
**Phạm vi:** Import Excel yêu cầu báo giá → inbox → phát hiện trùng → xóa.  
**Ngoài phạm vi Phase 1:** Bộ lọc kéo-thả / tag tiềm năng; tính chi phí; tạo Báo giá chuẩn; logo R2.

---

## 1. Bối cảnh & mục tiêu

Optimake có **Kinh doanh chuẩn** dùng chung. Ngoài ra cần **Customiz** — gói nghiệp vụ theo doanh nghiệp, gắn rõ **phân hệ**, có thể **cấp lại** cho công ty khác nếu nghiệp vụ trùng.

Phase 1 làm gói đầu: **REDECO — yêu cầu báo giá từ Excel** (inbox), nằm dưới menu Kinh doanh.

### Quyết định đã chốt với người dùng

| # | Quyết định |
|---|---|
| 1 | Mỗi dòng Excel = **1 yêu cầu** riêng |
| 2 | Trùng theo **Báo giá số (cột A)**: trong file **và** so DB |
| 3 | Trùng vẫn **nhập** + tag `trung`; sau đó **xóa** được |
| 4 | Phase 1 **không** builder lọc; phân loại tự động = phase sau |
| 5 | Menu con Kinh doanh; entitlement dạng `customiz.kinh-doanh.redeco-rfq` |
| 6 | Phase 1 **chưa** chuyển thành Báo giá chuẩn |
| 7 | Approach **A**: gói Customiz theo DN/gói, không nhồi vào quotation core |
| 8 | Dòng đã soft-delete **không** còn tham gia check trùng |
| 9 | Upload: nhập dòng hợp lệ; dòng lỗi báo riêng (không reject cả file nếu còn dòng OK) |

---

## 2. Catalog & đặt chỗ

```
customiz
  customiz.kinh-doanh
    customiz.kinh-doanh.redeco-rfq
```

- **Phân hệ:** `kinh-doanh` → menu / hub Kinh doanh.  
- **Gói:** `redeco-rfq` — xuất xứ REDECO; superadmin có thể cấp cùng node cho tenant khác cùng nhu cầu.  
- Gói khác / phân hệ khác → node mới (`customiz.kho.…`, `customiz.kinh-doanh.<goi-khac>`).  
- UI label: **«Yêu cầu BG · REDECO»** (không chỉ «Customiz»).

Seed: `scripts/seed-modules.cjs` + entitle theo HĐ (demo/REDECO khi có).

---

## 3. Data model

### 3.1 `customiz_rfq_batches`

Một lần upload.

| Cột | Ý nghĩa |
|---|---|
| id | UUID PK |
| tenant_id | RLS |
| pack_key | text NOT NULL — vd `customiz.kinh-doanh.redeco-rfq` |
| file_name | text |
| row_total / row_imported / row_duplicate / row_error | int |
| attributes | JSONB — meta phụ |
| created_by | UUID (user) |
| created_at | timestamptz |

Index: `(tenant_id, pack_key, created_at desc)`.

### 3.2 `customiz_rfq_requests`

Một dòng Excel = một row.

| Cột | Ý nghĩa |
|---|---|
| id | UUID PK |
| tenant_id | RLS |
| pack_key | text NOT NULL |
| batch_id | FK → batches (nullable nếu tạo tay sau này) |
| external_quote_no | text — cột A; dùng check trùng |
| tags | text[] hoặc JSONB — gồm `trung` |
| attributes | JSONB — map cột B–R (+ raw) |
| deleted_at | soft-delete |
| created_at / updated_at | timestamptz |

Index: `(tenant_id, pack_key, external_quote_no)` WHERE `deleted_at IS NULL`; `(tenant_id, pack_key, created_at desc)`.

**Trùng:** cùng `tenant_id` + `pack_key` + `external_quote_no` (normalized trim), chỉ bản ghi `deleted_at IS NULL`, cộng trùng trong cùng batch trước khi insert.

### 3.3 Map cột Excel (header dòng 5, data từ dòng 6)

| Cột | Key `attributes` / field | Ghi chú |
|---|---|---|
| A | `external_quote_no` (cột static) | Số BG phía KH |
| B | `status_customer` | Lựa chọn / Chưa lựa chọn / Đang gửi báo giá |
| C | `buyer_contact` | Người phụ trách mua hàng |
| D | `end_customer` | Khách hàng cuối |
| E | `customer_site_abbr` | Cơ sở KH (viết tắt) |
| F | `customer_item_code` | Mã hàng KH cuối (SDV → xem J) |
| G | `system_item_code` | Mã hàng hệ thống |
| H | `request_quote_ref` | Ghi nhận, ít dùng |
| I | `product_name` | Tên SP ban đầu |
| J | `model_or_end_code` | Thương mại = kiểu mẫu; gia công = mã KH cuối |
| K | `spec` | Quy cách |
| L | `manufacturer` | Hãng |
| M | `uom` | Đơn vị |
| N | `qty_expected` | SL đặt dự kiến |
| O | `po_qty_last_year` | PO năm trước |
| P | `request_date` | Ngày lên yêu cầu (deadline) |
| Q | `quotation_closing_date` | Closing date |
| R | `closing_time` | Giờ đóng |

File mẫu Excel: người dùng sẽ cung cấp; fixture test gắn theo file đó.

### 3.4 RLS

- ENABLE RLS; policy tenant isolation qua `current_tenant_id()`.  
- API/UI chỉ expose khi `has_module_access` / `my_module_ids` chứa `customiz.kinh-doanh.redeco-rfq` (hoặc ancestor `customiz` / `customiz.kinh-doanh` nếu expand subtree).

---

## 4. Luồng ứng dụng

```
[Upload xlsx]
    → parse sheet (header row 5, data ≥ 6)
    → validate từng dòng
    → detect duplicate (batch + DB)
    → insert batch + requests (tag trung)
    → summary N/M/K
[List]
    → filter tag, ẩn deleted mặc định
[Detail]
    → readonly fields Phase 1; badge trùng
[Delete]
    → soft-delete; confirm
```

Giới hạn Phase 1 (cố định): file ≤ 5MB; ≤ 2000 dòng data; chỉ `.xlsx`.

---

## 5. UI (responsive)

- Desktop/iPad: list bảng đầy đủ; drawer/modal upload + summary.  
- Phone: card list; touch ≥ 44px.  
- Token design-system Optimake (glass, accent); không emoji-icon.  
- Skill `ui-ux-pro-max` khi implement.

Route gợi ý: `/{slug}/sales/customiz/redeco-rfq` (+ `/[id]`).

Service: `apps/web/src/services/customiz/redeco-rfq.service.ts` (không fetch trong component).

---

## 6. Phase sau (không làm trong Phase 1)

1. Rule builder kéo-thả → tag Tiềm năng / Cần cân nhắc / Không tiềm năng.  
2. Bổ sung chi phí / kết nối SP nội bộ.  
3. «Tạo báo giá» → quotation chuẩn Optimake.  
4. Tái sử dụng gói cho tenant khác (chỉ entitlement) hoặc tách gói trung tính `excel-rfq-v1` nếu brand «REDECO» không còn phù hợp.

---

## 7. Kiểm thử

- Unit/parse: map cột + skip dòng trống + duplicate trong batch.  
- Integration: 2 upload cùng `external_quote_no` → bản sau có tag `trung`; xóa bản cũ → upload lại không tag (hoặc tag chỉ trong-file).  
- Entitlement off → không menu / API reject.  
- `tsc --noEmit` sạch.

---

## 8. Việc cần từ người dùng trước implement

1. **Duyệt spec này.**  
2. **Gửi file Excel mẫu** (header dòng 5 đúng thực tế).  
3. Xác nhận tenant nhận gói đầu (demo / slug REDECO thật).
