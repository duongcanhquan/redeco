// Seed danh mục module dạng cây (idempotent — chạy lại không tạo trùng).
// Cấu trúc: [key dotted-path, tên, kind, mô tả]
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MODULES = [
  // 6 module gốc
  ['kinh-doanh', 'Kinh doanh', 'module', 'Báo giá, đơn hàng, khách hàng'],
  ['kho', 'Kho', 'module', 'Tồn kho, phiếu nhập/xuất, ATP nhà máy'],
  ['san-xuat', 'Sản xuất', 'module', 'Lệnh sản xuất, BOM, tiến độ (MES)'],
  ['ke-toan', 'Kế toán', 'module', 'Thu chi, công nợ, sổ sách'],
  ['nhan-su', 'Nhân sự', 'module', 'Hồ sơ nhân viên, chấm công'],
  ['hanh-chinh', 'Hành chính', 'module', 'Văn bản, tài sản, lịch họp'],
  ['thiet-bi', 'Thiết bị', 'module', 'Quản lý máy móc, bảo trì'],
  // Trợ lý AI — module tích hợp; superadmin cấp trên HĐ, admin công ty cấu hình key/cờ
  ['ai', 'Trợ lý AI', 'module', 'Tích hợp LLM: hỏi đáp, đánh giá chứng từ theo phân hệ'],
  ['ai.kinh-doanh', 'AI Kinh doanh', 'module', 'Trợ lý trên module Kinh doanh'],
  ['ai.kinh-doanh.hoi-dap', 'Hỏi đáp tổng quan', 'feature', 'Chat / tóm tắt KPI trên hub Kinh doanh'],
  ['ai.kinh-doanh.danh-gia-bao-gia', 'Đánh giá báo giá', 'feature', 'AI nhận xét chi tiết báo giá'],
  ['ai.kinh-doanh.danh-gia-don-hang', 'Đánh giá đơn hàng', 'feature', 'AI nhận xét chi tiết đơn hàng'],
  ['ai.kho', 'AI Kho', 'module', 'Trợ lý trên module Kho'],
  ['ai.kho.hoi-dap', 'Hỏi đáp Kho', 'feature', 'Chat / tóm tắt tồn, ATP, phiếu gần đây'],
  ['ai.san-xuat', 'AI Sản xuất', 'module', 'Trợ lý trên module Sản xuất'],
  ['ai.san-xuat.hoi-dap', 'Hỏi đáp SX', 'feature', 'Chat / tóm tắt LSX mở, thiếu NVL'],
  ['ai.nhan-su', 'AI Nhân sự', 'module', 'Trợ lý trên module Nhân sự'],
  ['ai.nhan-su.hoi-dap', 'Hỏi đáp NS', 'feature', 'Chat / tóm tắt NV, HĐ, chấm công'],
  ['ai.thiet-bi', 'AI Thiết bị', 'module', 'Trợ lý trên module Thiết bị / Bảo trì'],
  ['ai.thiet-bi.hoi-dap', 'Hỏi đáp TB', 'feature', 'Chat / tóm tắt máy, lệnh BT, OEE, meter'],
  ['ai.rag', 'Tri thức (RAG)', 'feature', 'Quản trị knowledge base / embeddings theo phân hệ'],
  // Customiz — gói theo DN, gắn phân hệ (có thể cấp lại cho CT khác cùng nghiệp vụ)
  ['customiz', 'Customiz', 'module', 'Gói nghiệp vụ tùy chỉnh theo doanh nghiệp'],
  ['customiz.kinh-doanh', 'Customiz Kinh doanh', 'module', 'Customiz gắn phân hệ Kinh doanh'],
  [
    'customiz.kinh-doanh.redeco-rfq',
    'Yêu cầu BG · REDECO (legacy)',
    'feature',
    'Alias cũ — dùng kinh-doanh.redeco',
  ],
  // Cây Kho Phase K1
  ['kho.ton-kho', 'Tồn kho', 'module', 'Xem tồn theo kho / ATP'],
  ['kho.phieu-kho', 'Phiếu kho', 'module', 'Nhập / xuất thành phẩm & NVL'],
  // Cây con của Kinh doanh — khớp UI Core O2C
  [
    'kinh-doanh.redeco',
    'Kinh doanh.REDECO',
    'module',
    'Hub đề xuất / tính / báo giá đã xong / cài đặt tính BG (REDECO)',
  ],
  ['kinh-doanh.khach-hang', 'Khách hàng', 'module', 'CRM, công nợ, timeline'],
  ['kinh-doanh.san-pham', 'Sản phẩm & kho', 'module', 'Danh mục SP, tồn ATP (tạm trong Sales)'],
  ['kinh-doanh.bao-gia', 'Báo giá', 'module', 'Tạo, sửa nháp, duyệt N cấp, chuyển đơn'],
  ['kinh-doanh.don-hang', 'Đơn hàng', 'module', 'Credit, ATP/CTP stub, theo dõi trạng thái'],
  ['kinh-doanh.giao-hang', 'Giao hàng', 'module', 'Lệnh giao, xuất kho trừ tồn'],
  ['kinh-doanh.hoa-don', 'Hóa đơn', 'module', 'Công nợ phải thu, thu tiền'],
  ['kinh-doanh.chiet-khau', 'Chiết khấu / KM', 'module', 'Quy tắc ưu tiên, tự áp báo giá'],
  ['kinh-doanh.duyet', 'Quy trình duyệt', 'module', 'Workflow N cấp cho báo giá'],
  ['kinh-doanh.bao-gia.tao-bao-gia', 'Tạo báo giá', 'feature', ''],
  ['kinh-doanh.bao-gia.duyet-bao-gia', 'Duyệt báo giá', 'feature', ''],
  ['kinh-doanh.don-hang.tao-don-hang', 'Tạo đơn hàng', 'feature', ''],
  ['kinh-doanh.don-hang.theo-doi-trang-thai', 'Theo dõi trạng thái', 'feature', ''],
];

function loadEnv(file) {
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return map;
}

async function main() {
  const env = loadEnv(path.join(__dirname, '..', 'apps', 'api', '.env'));
  const client = new Client({ connectionString: env.DIRECT_URL });
  await client.connect();

  // Sắp theo độ sâu để parent luôn tồn tại trước con
  const sorted = [...MODULES].sort(
    (a, b) => a[0].split('.').length - b[0].split('.').length,
  );

  let sortOrder = 0;
  for (const [key, name, kind, description] of sorted) {
    const parts = key.split('.');
    const parentKey = parts.length > 1 ? parts.slice(0, -1).join('.') : null;
    await client.query(
      `insert into public.modules (key, name, kind, description, sort_order, parent_id)
       values ($1, $2, $3, nullif($4, ''), $5,
               (select id from public.modules where key = $6))
       on conflict (key) do update
         set name = excluded.name, kind = excluded.kind,
             description = excluded.description`,
      [key, name, kind, description, sortOrder++, parentKey],
    );
    console.log(`upsert: ${key}`);
  }

  const { rows } = await client.query(
    `select count(*)::int as n from public.modules`,
  );
  console.log(`\nTổng số node trong catalog: ${rows[0].n}`);
  await client.end();
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
