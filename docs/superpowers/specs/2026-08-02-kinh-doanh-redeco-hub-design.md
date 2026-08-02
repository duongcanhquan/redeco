# Design: Hub Kinh doanh.REDECO (`kinh-doanh.redeco`)

**Ngày:** 2026-08-02  
**Trạng thái:** Đã implement H1–H3 (2026-08-02). H4 (công thức thật) chờ user.  
**Approach:** Hub shell + gói dữ liệu REDECO (Approach 1 — đã duyệt).  
**Thay thế / mở rộng:** gói RFQ P1–P2 (`customiz.kinh-doanh.redeco-rfq`) và placeholder C3–C4 trong `2026-08-02-customiz-quote-calc-catalog-notes.md`.

---

## 1. Mục tiêu

REDECO cần **luồng kinh doanh báo giá riêng**, không đi thẳng vào Báo giá Optimake chuẩn:

1. Thu thập / chọn trong nhiều **đề xuất báo giá** (Excel hoặc nhập tay)  
2. **Tính cost + giá** theo profile công thức DN (kiểm khả thi gộp trong bước tính)  
3. Duyệt kết quả, đổi trạng thái nội bộ  
4. **Tạo Báo giá Optimake** và **điều chỉnh trong hub** (sync nền) để gửi khách  
5. Sau này: khách OK → mở LSX (chưa làm trong hub này)

Khi Superadmin chỉ entitle gói REDECO, menu Kinh doanh **chỉ** hiện hub này (option **B**).

---

## 2. Quyết định đã chốt

| # | Chủ đề | Quyết định |
|---|---|---|
| 1 | Menu | **B** — giữ nhóm «Kinh doanh»; chỉ tick redeco → chỉ mục «Kinh doanh.REDECO» |
| 2 | Catalog key | **`kinh-doanh.redeco`** — label Superadmin/UI: «Kinh doanh.REDECO» |
| 3 | Entitlement tabs | **Một** node hub = đủ 4 tab (không tách 4 key con) |
| 4 | Architecture | Approach **1** — hub shell + bảng REDECO; bridge sync `quotations` |
| 5 | Lên đơn kiểm | **C** — gộp vào tab **Tính báo giá** |
| 6 | Chuyển sản xuất | **Chỉ đánh dấu nội bộ** — chưa tạo LSX / ĐH |
| 7 | Gửi khách | Tạo **Báo giá Optimake**; sửa được |
| 8 | Chỉnh BG | **C** — sửa dòng/giá **trong hub** tab 3 → sync chứng từ BG nền; không bắt buộc hiện menu «Báo giá» |
| 9 | Bộ lọc RFQ P2 | Giữ gắn **tab 1** (gần list đề xuất) |
| 10 | Công thức chi tiết | User viết sau → Phase **H4** |

---

## 3. Catalog, menu & routing

### 3.1 Catalog

```
kinh-doanh
  … (khach-hang, bao-gia, don-hang — chuẩn, không đổi)
  kinh-doanh.redeco          ← NEW (hub)
```

- Seed `scripts/seed-modules.cjs`: thêm node `kinh-doanh.redeco`.  
- **Migrate entitlement:** HĐ có `customiz.kinh-doanh.redeco-rfq` → thêm/đổi sang `kinh-doanh.redeco`.  
- Alias tạm trong code: `hasModuleKey(..., 'kinh-doanh.redeco') || hasModuleKey(..., 'customiz.kinh-doanh.redeco-rfq')` đến khi migrate xong.  
- Có thể deprecate node `customiz.kinh-doanh.redeco-rfq` (ẩn hoặc xóa sau migrate) — không bắt buộc xóa ngay.

### 3.2 Menu (`resolveSalesTabs`)

- Nếu entitled `kinh-doanh.redeco` (hoặc alias cũ): thêm tab nav **`kinh-doanh-redeco`** label «Kinh doanh.REDECO».  
- Tab chuẩn (KH, BG, ĐH, …) chỉ hiện khi entitlement tương ứng — **không** auto-hiện BG chỉ vì hub sync BG.  
- Chỉ entitle redeco → sidebar nhóm Kinh doanh chỉ còn 1 mục hub (+ giữ các mục platform khác nếu có, vd Hướng dẫn / AI nếu được entitle riêng).

### 3.3 Routing

| Path | Vai trò |
|---|---|
| `/app/sales/redeco` | Hub 4 tab (`?tab=proposals\|calc\|done\|settings`) |
| `/app/sales/customiz/redeco-rfq` | **Redirect** → `/app/sales/redeco?tab=proposals` |
| Detail đề xuất | `/app/sales/redeco?tab=proposals&requestId=<id>` (panel/drawer trên hub; không route con bắt buộc ở H1) |

---

## 4. Data model

### 4.1 Tái sử dụng (P1–P2)

| Bảng | Thay đổi |
|---|---|
| `customiz_rfq_batches` | Giữ; `pack_key` mặc định / migrate → `kinh-doanh.redeco` |
| `customiz_rfq_requests` | Giữ; thêm tay = insert **không** `batch_id` |
| `customiz_rfq_filter_profiles` | Giữ; cùng `pack_key` |

### 4.2 Bảng mới

**`redeco_quote_calc_profiles`**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | RLS |
| pack_key | text NOT NULL | `kinh-doanh.redeco` |
| name | text NOT NULL | |
| is_default | boolean | 1 default / tenant+pack (enforce app hoặc partial unique) |
| config | jsonb NOT NULL DEFAULT `{}` | Công thức/tham số — schema chi tiết H4 |
| created_at / updated_at | timestamptz | |

**`redeco_quote_calculations`**

| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | RLS |
| pack_key | text NOT NULL | |
| request_id | uuid NOT NULL FK → `customiz_rfq_requests` | |
| profile_id | uuid NULL FK → profiles | Snapshot tên/config trong JSON nếu profile đổi sau |
| input_snapshot | jsonb | Dữ liệu đề xuất + tham số lúc tính |
| output_snapshot | jsonb | Cost, giá, breakdown, feasibility |
| hub_status | text | Xem §4.3 |
| quotation_id | uuid NULL FK → `quotations` | Sync BG Optimake |
| calculated_at | timestamptz | |
| created_by | uuid NULL | |
| created_at / updated_at | timestamptz | |
| deleted_at | timestamptz NULL | Soft-delete nếu cần |

Index: `(tenant_id, pack_key, hub_status, calculated_at desc)`, `(tenant_id, request_id)`, `(tenant_id, quotation_id)`.

RLS: policy tenant isolation chuẩn (`current_tenant_id()`).

### 4.3 `hub_status` (nội bộ — tách `quotations.status`)

| Value | UI | Ý nghĩa |
|---|---|---|
| `pending` | Pending | Đã tính, chờ xử lý |
| `review` | Xem lại | Cần xem lại |
| `rejected` | Không đạt | Không đạt |
| `to_production` | Chuyển sản xuất | Đánh dấu nội bộ — **không** tạo LSX |
| `quoted` | Đã tạo BG | Đã có / sync `quotation_id` |

Chuyển status: cho phép các chuyển hợp lý trong UI (vd. pending ↔ review; → rejected; → to_production; → quoted khi tạo BG). Không ép state machine cứng trong MVP trừ forbidden rõ (vd. rejected → to_production cần confirm).

### 4.4 Quan hệ

```
customiz_rfq_requests  1 ─── N  redeco_quote_calculations
redeco_quote_calc_profiles  1 ─── N  calculations (nullable sau xóa profile)
redeco_quote_calculations  0..1 ─── 1  quotations
```

Một request có thể tính nhiều lần; tab 3 liệt kê **calculations** (không chỉ request).

### 4.5 Ràng buộc sync BG Optimake

`quotations` yêu cầu `customer_id`; `quotation_items` yêu cầu `product_id`.

MVP H3:

- **Khách:** tìm theo mã/tên từ đề xuất hoặc tạo khách tối thiểu (đánh dấu `attributes.source = 'kinh-doanh.redeco'`).  
- **Sản phẩm:** dùng **SP placeholder** tenant (tạo 1 lần khi sync lần đầu nếu chưa có), tên/mô tả dòng lấy từ đề xuất; chi tiết map catalog SP = sau.  
- Sửa trong hub: cập nhật `quotation_items.unit_price` / qty / line_total (+ header total); không bắt user mở `/sales/quotations`.

---

## 5. UI — 4 tab

Shell: 1 trang, tab bar; mobile-first; touch ≥44px; skeleton / empty / error theo Sales hiện tại.

| Tab | Key | Nội dung |
|---|---|---|
| 1 Đề xuất báo giá | `proposals` | List + tag filter; import Excel; thêm tay; soft-delete; chạy lại lọc; «Đưa sang Tính» |
| 2 Tính báo giá | `calc` | Chọn request + profile; Tính; hiện snapshot; Lưu → calculation `pending` |
| 3 Báo giá đã xong | `done` | List calculations; filter ngày/status; đổi hub_status; tạo/sửa BG sync |
| 4 Cài đặt tính BG | `settings` | CRUD calc profiles (`config` form/JSON theo phase) |

Bộ lọc nếu–thì P2: panel trên **tab 1**.

---

## 6. Luồng nghiệp vụ (happy path)

```
[Excel/Tay] → request (tab1, tags)
     → chọn → tab2: profile + Tính + Lưu
     → calculation pending (tab3)
     → (tuỳ) review / rejected / to_production
     → Tạo BG Optimake + sửa dòng trong hub → hub_status=quoted
     → (tương lai) khách OK → LSX
```

---

## 7. Phased delivery

| Phase | Phạm vi | Tiêu chí xong |
|---|---|---|
| **H1 Shell** | Catalog + migrate entitlement; menu B; hub route 4 tab; redirect RFQ; gộp P1–P2 + thêm tay vào tab 1 | Chỉ entitle redeco → menu đúng; import/lọc/thêm tay OK |
| **H2 Tính + profile** | Profiles + calculations; tab 4 CRUD; tab 2 stub engine + lưu; tab 3 list + đổi status | Lưu calculation + đổi status; output có thể stub |
| **H3 Sync BG** | Tạo/cập nhật quotation + items; editor hub sync | Có `quotation_id`; sửa hub phản ánh DB |
| **H4 Công thức** | Engine thật theo tài liệu user | Cost/giá đúng REDECO |
| **Sau** | Nối LSX khi SX REDECO sẵn | — |

Thứ tự: **H1 → H2 → H3**; H4 độc lập sau H2 khi có công thức.

---

## 8. Ngoài phạm vi

- Tạo LSX / ĐH từ «Chuyển sản xuất»  
- Builder lọc kéo-thả (P2 form giữ nguyên)  
- Đổi schema core `quotations`  
- Bắt buộc hiện menu «Báo giá» khi chỉ entitle redeco  
- Công thức chi tiết trước khi user cung cấp (H4)

---

## 9. Kiểm thử (tóm tắt)

- Entitle chỉ `kinh-doanh.redeco` → sidebar chỉ hub dưới Kinh doanh.  
- Entitle thêm `kinh-doanh.bao-gia` → hiện cả hub + tab Báo giá.  
- Redirect path RFQ cũ.  
- H2: tạo profile default; tính stub; đổi status.  
- H3: tạo BG; sửa giá hub = DB quotation_items.  
- RLS: tenant A không đọc calculations tenant B.

---

## 10. Tài liệu liên quan

- `docs/superpowers/specs/2026-08-02-customiz-redeco-rfq-design.md` (P1)  
- Notes brainstorm: `docs/superpowers/specs/2026-08-02-customiz-quote-calc-catalog-notes.md`  
- Sales core: migrations `quotations` / `quotation_items`
