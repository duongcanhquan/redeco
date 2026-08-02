/**
 * Gán kinh-doanh.redeco (+ legacy customiz nếu còn) vào HĐ active tenant demo.
 * Chạy: node scripts/seed-modules.cjs && node scripts/entitle-demo-kinh-doanh-redeco.cjs
 */
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
  const pg = new Client({ connectionString: env.DIRECT_URL });
  await pg.connect();
  try {
    const tenant = await pg.query(`select id from public.tenants where slug = 'demo'`);
    if (!tenant.rows[0]) throw new Error('Chưa có tenant demo');
    const contract = await pg.query(
      `select id from public.contracts where tenant_id = $1 and status = 'active' order by ends_on desc limit 1`,
      [tenant.rows[0].id],
    );
    if (!contract.rows[0]) throw new Error('Demo chưa có hợp đồng active');
    const mods = await pg.query(
      `select id, key from public.modules
       where key = 'kinh-doanh.redeco'
          or key = 'customiz'
          or key like 'customiz.%'`,
    );
    if (!mods.rows.some((r) => r.key === 'kinh-doanh.redeco')) {
      throw new Error('Chưa seed kinh-doanh.redeco — chạy seed-modules.cjs');
    }
    for (const m of mods.rows) {
      await pg.query(
        `insert into public.contract_entitlements (contract_id, module_id)
         values ($1, $2) on conflict do nothing`,
        [contract.rows[0].id, m.id],
      );
      console.log('entitled:', m.key);
    }
    console.log('OK — menu Kinh doanh hiện «Kinh doanh.REDECO»');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
