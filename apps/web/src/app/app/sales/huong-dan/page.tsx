import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  Package,
  ScrollText,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { FlowSteps } from '@/components/ui/flow-steps';
import {
  MockBarChart,
  MockBtn,
  MockPill,
  MockRow,
  MockScreen,
  VerticalFlow,
} from '@/components/sales/guide/mock-ui';
import { getSessionClaims } from '@/lib/supabase/server';
import { GuideToc } from './guide-toc';

export const dynamic = 'force-dynamic';

const TOC = [
  { id: 'ban-do', label: '1. Bản đồ toàn bộ' },
  { id: 'tong-quan', label: '2. Màn Tổng quan' },
  { id: 'khach-hang', label: '3. Khách hàng' },
  { id: 'san-pham', label: '4. Sản phẩm' },
  { id: 'bao-gia', label: '5. Báo giá' },
  { id: 'don-hang', label: '6. Đơn hàng' },
  { id: 'giao-hang', label: '7. Giao hàng' },
  { id: 'hoa-don', label: '8. Hóa đơn' },
  { id: 'trang-thai', label: '9. Bảng trạng thái' },
  { id: 'meo', label: '10. Mẹo nhanh' },
] as const;

export default async function SalesGuidePage() {
  const claims = await getSessionClaims();
  const base = claims?.tenantSlug ? `/${claims.tenantSlug}` : '/app';

  return (
    <div className="sales-guide space-y-6 max-w-5xl text-ink">
      <header className="space-y-3">
        <Link
          href={`${base}/sales`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-accent min-h-11"
        >
          <ArrowLeft size={16} aria-hidden />
          Về Tổng quan Kinh doanh
        </Link>
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-ink tracking-tight">
              <BookOpen className="text-accent shrink-0" size={28} aria-hidden />
              Hướng dẫn dùng — Kinh doanh
            </h1>
            <p className="text-base text-ink-muted mt-2 max-w-xl leading-relaxed">
              Đọc theo hình và bảng. Ít chữ — làm theo từng bước là xong.
            </p>
          </div>
        </div>
      </header>

      <GuideToc items={[...TOC]} />

      {/* —— 1. Bản đồ —— */}
      <section id="ban-do" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">1. Bản đồ toàn bộ</h2>
        <p className="text-base text-ink-muted leading-relaxed">
          Một đơn hàng đi từ trái sang phải. Mỗi ô là một màn hình trong menu.
        </p>
        <FlowSteps
          ariaLabel="Luồng bán hàng từ khách đến thu tiền"
          steps={[
            { key: 'kh', label: 'Khách hàng', icon: <Users size={16} aria-hidden />, tone: 'default' },
            { key: 'sp', label: 'Sản phẩm', icon: <Package size={16} aria-hidden />, tone: 'default' },
            { key: 'bg', label: 'Báo giá', icon: <FileText size={16} aria-hidden />, tone: 'accent' },
            { key: 'dh', label: 'Đơn hàng', icon: <ScrollText size={16} aria-hidden />, tone: 'accent' },
            { key: 'gh', label: 'Giao hàng', icon: <Truck size={16} aria-hidden />, tone: 'warning' },
            { key: 'hd', label: 'Hóa đơn', icon: <Wallet size={16} aria-hidden />, tone: 'success' },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold">Luồng chuẩn (hay dùng nhất)</p>
            <VerticalFlow
              steps={[
                { label: 'Tạo khách + sản phẩm', hint: 'Làm một lần, dùng lại nhiều' },
                { label: 'Làm báo giá → gửi duyệt', hint: 'Có thể bỏ qua nếu bán thẳng', tone: 'accent' },
                { label: 'Chuyển thành đơn → xác nhận', hint: 'Hệ thống kiểm tra công nợ + tồn', tone: 'accent' },
                { label: 'Tạo lệnh giao → xuất kho', hint: 'Trừ hàng trong kho', tone: 'warning' },
                { label: 'Xuất hóa đơn → thu tiền', hint: 'Theo dõi công nợ', tone: 'success' },
              ]}
            />
          </div>
          <MockScreen title="Menu Kinh doanh (mô phỏng)" footer="Tab trên cùng = chỗ làm việc chính">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {['Tổng quan', 'Khách', 'SP', 'Báo giá', 'Đơn', 'Giao', 'HĐ'].map((t, i) => (
                <MockPill key={t} tone={i === 0 ? 'accent' : 'muted'}>
                  {t}
                </MockPill>
              ))}
            </div>
            <MockRow left="Tổng quan" right="Số liệu hôm nay" tone="accent" />
            <MockRow left="Khách hàng" right="Danh bạ" />
            <MockRow left="Sản phẩm" right="Giá + tồn" />
            <MockRow left="Báo giá → Đơn → Giao → Hóa đơn" right="Chứng từ" />
          </MockScreen>
        </div>
      </section>

      {/* —— 2. Tổng quan —— */}
      <section id="tong-quan" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">2. Màn Tổng quan</h2>
        <p className="text-base text-ink-muted leading-relaxed">
          Nhìn nhanh: việc đang chờ, đơn đang chạy, công nợ.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MockScreen title="Tổng quan Kinh doanh" footer="Bấm ô số → nhảy sang danh sách tương ứng">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-accent-soft/40 border border-accent/25 p-3">
                <p className="text-xs font-medium text-ink-muted">Khách hoạt động</p>
                <p className="text-xl font-bold tabular-nums text-ink">24</p>
              </div>
              <div className="rounded-xl bg-warning/10 border border-warning/30 p-3">
                <p className="text-xs font-medium text-ink-muted">Báo giá chờ</p>
                <p className="text-xl font-bold tabular-nums text-warning">3</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/15 p-3">
                <p className="text-xs font-medium text-ink-muted">Đơn đang chạy</p>
                <p className="text-xl font-bold tabular-nums text-ink">7</p>
              </div>
              <div className="rounded-xl bg-warning/10 border border-warning/30 p-3">
                <p className="text-xs font-medium text-ink-muted">Công nợ</p>
                <p className="text-lg font-bold tabular-nums text-ink">45tr</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/15 p-3">
              <p className="text-xs font-medium text-ink-muted mb-2">Giá trị hóa đơn 14 ngày (mẫu)</p>
              <MockBarChart />
            </div>
          </MockScreen>
          <div className="glass rounded-2xl p-4 overflow-x-auto">
            <p className="text-base font-bold text-ink mb-3">Ô số nghĩa là gì?</p>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="py-2 pr-3 font-semibold">Ô</th>
                  <th className="py-2 font-semibold">Ý nghĩa</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-panel/20">
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Khách hoạt động</td>
                  <td className="py-2.5 text-ink-muted">Khách đang dùng (không bị khóa)</td>
                </tr>
                <tr className="border-b border-panel/20">
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Báo giá chờ</td>
                  <td className="py-2.5 text-ink-muted">Đang gửi duyệt / chờ bạn xử lý</td>
                </tr>
                <tr className="border-b border-panel/20">
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Đơn đang chạy</td>
                  <td className="py-2.5 text-ink-muted">Đã xác nhận hoặc đang giao</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-medium whitespace-nowrap">Công nợ</td>
                  <td className="py-2.5 text-ink-muted">Hóa đơn chưa thu tiền</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* —— 3. Khách hàng —— */}
      <section id="khach-hang" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">3. Khách hàng</h2>
        <p className="text-base text-ink-muted leading-relaxed">
          Tạo khách trước khi làm báo giá / đơn. Ghi rõ loại khách để sau này áp chiết khấu đúng.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MockScreen title="Danh sách khách" footer="Phone: dạng thẻ · Máy tính: dạng bảng">
            <MockRow left="KH-0001 · Công ty ABC" right="B2B" tone="accent" />
            <MockRow left="KH-0002 · Chị Lan" right="B2C" />
            <MockRow left="KH-0003 · Đại lý miền Tây" right="Đại lý" />
            <div className="pt-2 flex gap-2">
              <MockBtn primary>+ Thêm khách</MockBtn>
              <MockBtn>Tìm kiếm</MockBtn>
            </div>
          </MockScreen>
          <div className="glass rounded-2xl p-4 overflow-x-auto">
            <p className="text-sm font-semibold mb-3">Cột / trường cần nhớ</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-panel/40 text-left">
                  <th className="py-2 pr-2 font-medium">Trường</th>
                  <th className="py-2 font-medium">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-panel/20">
                  <td className="py-2 pr-2 font-medium">Mã</td>
                  <td className="py-2 text-ink-muted">Hệ thống tự sinh (KH-…)</td>
                </tr>
                <tr className="border-b border-panel/20">
                  <td className="py-2 pr-2 font-medium">Loại</td>
                  <td className="py-2 text-ink-muted">B2B · B2C · Đại lý</td>
                </tr>
                <tr className="border-b border-panel/20">
                  <td className="py-2 pr-2 font-medium">Hạn mức tín dụng</td>
                  <td className="py-2 text-ink-muted">Trống = không giới hạn. Có số = chặn khi vượt nợ</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 font-medium">Chi tiết khách</td>
                  <td className="py-2 text-ink-muted">Xem lịch sử BG / ĐH / HĐ trên một trang</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* —— 4. Sản phẩm —— */}
      <section id="san-pham" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">4. Sản phẩm</h2>
        <p className="text-base text-ink-muted leading-relaxed">
          Giá chuẩn điền sẵn khi chọn SP trên báo giá. Tồn = số còn bán được (ATP) nếu đã mở Kho.
        </p>
        <MockScreen title="Sản phẩm & tồn" footer="Đồng bộ Kho giúp số tồn khớp nhà máy">
          <MockRow left="SP-A · Khung nhôm 2m" right="Giá 120.000 · Tồn 50" tone="success" />
          <MockRow left="SP-B · Kính cường lực" right="Giá 450.000 · Tồn 8" tone="warning" />
          <MockRow left="SP-C · Phụ kiện" right="Giá 25.000 · Tồn 0" />
        </MockScreen>
      </section>

      {/* —— 5. Báo giá —— */}
      <section id="bao-gia" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">5. Báo giá</h2>
        <FlowSteps
          ariaLabel="Các bước báo giá"
          steps={[
            { key: '1', label: 'Nháp', icon: <ClipboardList size={16} aria-hidden /> },
            { key: '2', label: 'Gửi duyệt', icon: <FileText size={16} aria-hidden />, tone: 'accent' },
            { key: '3', label: 'Đã duyệt', icon: <CheckCircle2 size={16} aria-hidden />, tone: 'success' },
            { key: '4', label: '→ Đơn hàng', icon: <ScrollText size={16} aria-hidden />, tone: 'accent' },
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MockScreen title="Tạo / sửa báo giá" footer="Chọn SP → giá tự điền → sửa SL / chiết khấu dòng">
            <div className="flex justify-between text-xs text-ink-muted mb-2">
              <span>BG-0012 · Khách ABC</span>
              <MockPill tone="muted">Nháp</MockPill>
            </div>
            <MockRow left="Khung nhôm × 10" right="1.200.000" />
            <MockRow left="Kính × 2" right="900.000" />
            <div className="flex justify-between text-sm pt-2 border-t border-panel/30">
              <span className="text-ink-muted">Tổng</span>
              <span className="font-bold tabular-nums">2.100.000</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <MockBtn>Lưu nháp</MockBtn>
              <MockBtn primary>Gửi duyệt</MockBtn>
            </div>
          </MockScreen>
          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold">Ai làm gì?</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-panel/40 text-left">
                  <th className="py-2 font-medium">Người</th>
                  <th className="py-2 font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-panel/20">
                  <td className="py-2 font-medium">Nhân viên KD</td>
                  <td className="py-2 text-ink-muted">Tạo nháp → Gửi duyệt</td>
                </tr>
                <tr className="border-b border-panel/20">
                  <td className="py-2 font-medium">Người duyệt</td>
                  <td className="py-2 text-ink-muted">Duyệt hoặc Từ chối (theo cấp)</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Sau khi duyệt</td>
                  <td className="py-2 text-ink-muted">Bấm «Chuyển đơn» → sang Đơn hàng</td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-ink-muted">
              Chiết khấu / KM và Quy trình duyệt: chỉ quản trị cấu hình (tab riêng).
            </p>
          </div>
        </div>
      </section>

      {/* —— 6. Đơn hàng —— */}
      <section id="don-hang" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">6. Đơn hàng</h2>
        <p className="text-base text-ink-muted leading-relaxed">
          Khi <strong>Xác nhận đơn</strong>, hệ thống kiểm tra:
        </p>
        <ul className="text-base text-ink-muted list-disc pl-5 space-y-1.5 leading-relaxed">
          <li>Công nợ + giá trị đơn ≤ hạn mức tín dụng khách</li>
          <li>
            Số còn bán được (ATP) — có thể giữ chỗ hàng trong kho để người khác không bán chồng
          </li>
        </ul>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MockScreen title="Chi tiết đơn DH-0008" footer="Nút In · Tạo lệnh giao · Xuất hóa đơn">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-semibold">DH-0008</span>
              <MockPill tone="success">Đã xác nhận</MockPill>
            </div>
            <MockRow left="3 dòng hàng" right="12.500.000" tone="accent" />
            <MockRow left="Credit" right="Đạt ✓" tone="success" />
            <MockRow left="Tồn / giữ chỗ" right="Đủ 2 · Thiếu 1" tone="warning" />
            <div className="flex flex-wrap gap-2 pt-2">
              <MockBtn primary>Tạo lệnh giao</MockBtn>
              <MockBtn>Xuất hóa đơn</MockBtn>
              <MockBtn>In</MockBtn>
            </div>
          </MockScreen>
          <div className="glass rounded-2xl p-4">
            <p className="text-sm font-semibold mb-3">Thiếu hàng thì sao?</p>
            <VerticalFlow
              steps={[
                {
                  label: 'Vẫn xác nhận được (nếu Cài đặt cho phép)',
                  hint: 'Phần thiếu gắn sản xuất sau',
                  tone: 'warning',
                },
                {
                  label: 'Nút «Tạo lệnh SX»',
                  hint: 'Hiện khi có phân hệ Sản xuất + còn thiếu',
                  tone: 'accent',
                },
                {
                  label: 'Hoặc nhập thêm tồn ở Kho',
                  hint: 'Rồi mới xuất giao',
                  tone: 'success',
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* —— 7. Giao hàng —— */}
      <section id="giao-hang" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">7. Giao hàng</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MockScreen title="Lệnh giao GH-0003" footer="Xuất kho = trừ tồn thật (không hoàn tác nhẹ)">
            <MockRow left="Từ đơn DH-0008" right="" />
            <div className="flex gap-2 items-center">
              <MockPill tone="warning">Chờ xuất</MockPill>
              <span className="text-xs text-ink-muted">→</span>
              <MockPill tone="success">Đã xuất</MockPill>
            </div>
            <div className="pt-3">
              <MockBtn primary>Xuất kho</MockBtn>
            </div>
          </MockScreen>
          <div className="glass rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-panel/40 text-left">
                  <th className="py-2 font-medium">Bước</th>
                  <th className="py-2 font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-panel/20">
                  <td className="py-2 font-medium">Tạo lệnh giao</td>
                  <td className="py-2 text-ink-muted">Đơn → «Đang giao»</td>
                </tr>
                <tr className="border-b border-panel/20">
                  <td className="py-2 font-medium">Xuất kho</td>
                  <td className="py-2 text-ink-muted">Trừ tồn · nhả giữ chỗ · đơn «Hoàn tất»</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">In phiếu</td>
                  <td className="py-2 text-ink-muted">Nút In trên danh sách / chi tiết</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* —— 8. Hóa đơn —— */}
      <section id="hoa-don" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">8. Hóa đơn</h2>
        <p className="text-base text-ink-muted leading-relaxed">
          Có thể xuất hóa đơn khi đơn đã xác nhận / đang giao / hoàn tất (linh hoạt đặt cọc hoặc thu
          trước).
        </p>
        <MockScreen title="Hóa đơn HD-0015" footer="Đã thu tiền → hết công nợ dòng này">
          <div className="flex justify-between items-center">
            <span className="font-semibold">HD-0015</span>
            <MockPill tone="warning">Chưa thu</MockPill>
          </div>
          <MockRow left="Khách ABC" right="12.500.000" tone="accent" />
          <div className="flex gap-2 pt-2">
            <MockBtn primary>Đã thu tiền</MockBtn>
            <MockBtn>In</MockBtn>
          </div>
        </MockScreen>
      </section>

      {/* —— 9. Trạng thái —— */}
      <section id="trang-thai" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold text-ink">9. Bảng trạng thái (tra cứu nhanh)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusTable
            title="Báo giá"
            rows={[
              ['Nháp', 'Đang soạn, sửa được'],
              ['Chờ duyệt', 'Đã gửi, chờ người duyệt'],
              ['Đã duyệt', 'Được chuyển đơn'],
              ['Từ chối', 'Dừng — tạo BG mới nếu cần'],
              ['Đã chuyển đơn', 'Đã có đơn hàng'],
            ]}
          />
          <StatusTable
            title="Đơn hàng"
            rows={[
              ['Nháp', 'Chưa chốt'],
              ['Đã xác nhận', 'Đã kiểm tra credit + tồn'],
              ['Đang giao', 'Đã có lệnh giao'],
              ['Hoàn tất', 'Đã xuất kho'],
              ['Đã hủy', 'Không xử lý tiếp'],
            ]}
          />
          <StatusTable
            title="Giao hàng"
            rows={[
              ['Chờ xuất', 'Chưa trừ kho'],
              ['Đã xuất', 'Đã trừ tồn'],
            ]}
          />
          <StatusTable
            title="Hóa đơn"
            rows={[
              ['Chưa thu', 'Còn công nợ'],
              ['Đã thu', 'Khách đã trả'],
            ]}
          />
        </div>
      </section>

      {/* —— 10. Mẹo —— */}
      <section id="meo" className="scroll-mt-24 space-y-4 pb-8">
        <h2 className="text-xl font-bold text-ink">10. Mẹo nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ['Lọc nhanh', 'Trên danh sách: dùng chip trạng thái + ô tìm mã'],
            ['In chứng từ', 'Nút In trên chi tiết hoặc danh sách (kể cả điện thoại)'],
            ['Thiếu quyền tab', 'Chỉ thấy tab được giao — hỏi quản trị công ty'],
            ['Giữ chỗ hàng', 'Bật ở Cài đặt → Kho — xác nhận đơn sẽ giữ tồn'],
            ['Cấu hình duyệt / CK', 'Chỉ chủ / admin: tab Chiết khấu & Quy trình duyệt'],
            ['Kế toán', 'Hóa đơn / thu tiền đẩy sự kiện sang phân hệ Kế toán (nếu có)'],
          ].map(([t, d]) => (
            <div key={t} className="glass rounded-2xl p-4 flex gap-3">
              <ShoppingCart className="text-accent shrink-0 mt-0.5" size={18} aria-hidden />
              <div>
                <p className="text-sm font-bold text-ink">{t}</p>
                <p className="text-sm text-ink-muted mt-1 leading-snug">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href={`${base}/sales`}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-app"
          >
            Về Tổng quan và bắt đầu làm
          </Link>
          <Link
            href={`${base}/sales/quotations`}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 font-semibold text-ink hover:text-accent hover:border-accent/40"
          >
            Mở Báo giá
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatusTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="glass rounded-2xl p-4 overflow-x-auto">
      <p className="text-base font-bold text-ink mb-2">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/20 text-left">
            <th className="py-2 pr-2 font-semibold">Trạng thái</th>
            <th className="py-2 font-semibold">Nghĩa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a} className="border-b border-white/10 last:border-0">
              <td className="py-2.5 pr-2 font-bold text-ink whitespace-nowrap">{a}</td>
              <td className="py-2.5 text-ink-muted leading-snug">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
