// Backfill claim app_metadata.tenant_slug cho toàn bộ user hiện có.
// Proxy định tuyến /{slug}/... dựa trên claim này — user tạo trước
// tính năng tên miền cần được đồng bộ một lần. Chạy lại an toàn (idempotent).
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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
  const base = env.SUPABASE_URL;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const pg = new Client({ connectionString: env.DIRECT_URL });
  await pg.connect();

  try {
    const { rows } = await pg.query(`
      select up.id, t.slug
      from public.user_profiles up
      join public.tenants t on t.id = up.tenant_id
    `);
    console.log(`Tìm thấy ${rows.length} user thuộc công ty.`);

    let updated = 0;
    for (const row of rows) {
      const res = await fetch(`${base}/auth/v1/admin/users/${row.id}`, { headers });
      if (!res.ok) {
        console.warn(`  ! Không đọc được user ${row.id}: ${res.status}`);
        continue;
      }
      const user = await res.json();
      const meta = user.app_metadata || {};
      if (meta.tenant_slug === row.slug) continue;

      const put = await fetch(`${base}/auth/v1/admin/users/${row.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ app_metadata: { ...meta, tenant_slug: row.slug } }),
      });
      if (!put.ok) {
        console.warn(`  ! Cập nhật thất bại user ${row.id}: ${put.status} ${await put.text()}`);
        continue;
      }
      updated++;
      console.log(`  + ${row.id} -> tenant_slug = ${row.slug}`);
    }
    console.log(`Xong: cập nhật ${updated}/${rows.length} user.`);
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
