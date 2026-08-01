// Seed danh mục module dạng cây (idempotent — chạy lại không tạo trùng).
// Cấu trúc: [key dotted-path, tên, kind, mô tả]
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MODULES = [
  // 6 module gốc
  ['kinh-doanh', 'Kinh doanh', 'module', 'Báo giá, đơn hàng, khách hàng'],
  ['san-xuat', 'Sản xuất', 'module', 'Lệnh sản xuất, BOM, tiến độ (MES)'],
  ['ke-toan', 'Kế toán', 'module', 'Thu chi, công nợ, sổ sách'],
  ['nhan-su', 'Nhân sự', 'module', 'Hồ sơ nhân viên, chấm công'],
  ['hanh-chinh', 'Hành chính', 'module', 'Văn bản, tài sản, lịch họp'],
  ['thiet-bi', 'Thiết bị', 'module', 'Quản lý máy móc, bảo trì'],
  // Cây con của Kinh doanh (module nghiệp vụ đầu tiên)
  ['kinh-doanh.khach-hang', 'Khách hàng', 'module', 'Danh bạ khách hàng, liên hệ, phân loại'],
  ['kinh-doanh.bao-gia', 'Báo giá', 'module', 'Tạo và quản lý báo giá'],
  ['kinh-doanh.don-hang', 'Đơn hàng', 'module', 'Đơn hàng bán, theo dõi trạng thái'],
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
