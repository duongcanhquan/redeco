# Spec: Menu theo chức danh + Hub Tab

**Ngày:** 2026-08-02  
**Trạng thái:** ĐÃ DUYỆT (người dùng)  
**Quyết định:** N2 + R2 + P3 (menu trước, giữ chỗ hàng sau)

## Mục tiêu

- Thanh bên ít dòng; tập trung thao tác trong từng cửa sổ phân hệ (tab).
- Nhân viên chỉ thấy phân hệ / tab được giao (+ tab phụ thuộc đọc).
- Quản trị công ty thấy đủ phân hệ đã mua; nhóm sổ/thu trên thanh bên.
- Chữ giao diện: tiếng Việt ngắn; viết tắt chuyên môn có mở ngoặc.

## Sidebar

| Vai trò | Hành vi |
|---|---|
| Chủ / admin | Tổng quan · 1 dòng mỗi phân hệ (có sổ/thu) · Công ty (Thành viên, Cài đặt) |
| Thành viên | Tổng quan · chỉ phân hệ được giao · Tài khoản |

Không liệt kê KH / BG / ĐH… trên sidebar.

## Hub + Tab

Mỗi phân hệ một hub; tab bên trong:

- **Kinh doanh** `/sales?tab=` — tong-quan | khach-hang | san-pham | bao-gia | don-hang | giao-hang | hoa-don | (cau-hinh nếu quản trị)
- **Kho** `/inventory?tab=` — tong-quan | ton-kho | phieu-kho | kho
- **Sản xuất** `/production?tab=` — tong-quan | bom | lenh-sx
- **Kế toán** `/accounting?tab=` — tong-quan (+ tab sau nếu có)

Route con cũ (`/sales/quotations`…) vẫn hoạt động; tab active theo pathname hoặc `?tab=`.

## Lọc quyền (N2 + R2)

Nguồn: `my_module_ids()` / gán thành viên.

| Node được giao | Tab hiện |
|---|---|
| `kinh-doanh` (gốc hoặc đủ nhánh) | Tất cả tab KD (trừ cấu hình: chỉ quản trị) |
| `kinh-doanh.khach-hang` | khach-hang |
| `kinh-doanh.san-pham` | san-pham |
| `kinh-doanh.bao-gia` | bao-gia + **khach-hang** + **san-pham** (phụ thuộc đọc) |
| `kinh-doanh.don-hang` | don-hang + khach-hang + san-pham |
| `kinh-doanh.giao-hang` | giao-hang + don-hang |
| `kinh-doanh.hoa-don` | hoa-don + don-hang |
| `kinh-doanh.chiet-khau` / `duyet` | cau-hinh (chỉ quản trị; hoặc ẩn nếu không quản trị) |

Hợp nhất tập tab nếu giao nhiều node. Vào URL không quyền → redirect tab đầu được phép hoặc Tổng quan workspace.

Owner/admin: bỏ qua lọc node con — thấy đủ tab phân hệ công ty được entitle.

## Chữ

- Nhãn menu/tab: «Kinh doanh», «Báo giá», «Số còn bán được (ATP)» khi cần thuật ngữ.
- Tránh viết tắt trần trên UI.

## Ngoài phạm vi (bước sau)

- Giữ chỗ tồn khi xác nhận đơn (A)
- Hóa đơn / Giao hàng linh hoạt (B)
- Bảng giá theo loại khách (C)
