# Ghi nhận (placeholder): Customiz — Danh mục tính toán báo giá + chuyển BG (C3–C4)

**Ngày:** 2026-08-02  
**Trạng thái:** **Chờ người dùng viết chi tiết** — chưa brainstorm đủ, chưa implement.  
**Liên quan:** REDECO RFQ P1–P2 đã xong (`customiz.kinh-doanh.redeco-rfq`).

---

## Ý định đã nắm (từ trao đổi)

Sau bộ lọc phân loại (P2), luồng Customiz Kinh doanh tiếp tục:

### C3 — Danh mục tính toán báo giá theo doanh nghiệp

- Mỗi DN (vd **REDECO**) có **cách tính toán riêng** để lên đơn / báo giá.
- Đây là **danh mục / bộ quy tắc tính toán tự phát triển** trong Customiz — không cứng trong Kinh doanh chuẩn.
- Quy tắc **có thể sửa chữa / chỉnh sửa** bởi phía công ty (phụ trách KD / admin).
- Dùng để **bổ sung chi phí / tính toán** trên từng yêu cầu RFQ (sau khi đã import + phân loại).

### C4 — Tạo báo giá chuẩn từ RFQ

- Từ yêu cầu đã tính → **«Tạo báo giá»** sinh chứng từ Báo giá Optimake chuẩn.
- Áp dụng kết quả / cấu trúc từ danh mục tính toán C3.

### Nguyên tắc đặt chỗ (giữ từ P1)

- Gắn **phân hệ** `kinh-doanh` + **gói** theo DN (vd `…redeco-…`).
- Có thể **cấp lại entitlement** cho công ty khác nếu cùng nghiệp vụ tính toán.
- Không nhồi công thức DN vào core quotation dùng chung mọi tenant.

---

## Việc người dùng sẽ bổ sung sau

1. Mô tả / ví dụ công thức REDECO (biến đầu vào, bước tính, output chi phí/giá).  
2. Ai được sửa danh mục (owner/admin / role KD).  
3. Quan hệ với BOM / Kho / NVL nếu có.  
4. File / bảng mẫu (nếu có).  

→ Khi có nội dung: mở brainstorm → spec đầy đủ → plan → implement C3 rồi C4.

---

## Trạng thái codebase liên quan (đã có)

| Phase | Nội dung | Commit gần |
|---|---|---|
| P1 | Import Excel, trùng, inbox | `d293ad4` |
| P2 | Bộ lọc nếu–thì, tag tiềm năng | `6695824` |
| C3–C4 | Danh mục tính toán + tạo BG | **Placeholder này** |
