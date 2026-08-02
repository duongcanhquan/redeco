/**
 * Gán module `ai` (+ subtree) vào hợp đồng active của tenant demo.
 * Chạy: node scripts/seed-modules.cjs && node scripts/entitle-demo-ai.cjs
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
    const tenantId = tenant.rows[0].id;

    const contract = await pg.query(
      `select id from public.contracts where tenant_id = $1 and status = 'active' order by ends_on desc limit 1`,
      [tenantId],
    );
    if (!contract.rows[0]) throw new Error('Demo chưa có hợp đồng active');
    const contractId = contract.rows[0].id;

    const mods = await pg.query(
      `select id, key from public.modules where key = 'ai' or key like 'ai.%'`,
    );
    if (mods.rows.length === 0) throw new Error('Chưa seed module ai — chạy seed-modules.cjs');

    for (const m of mods.rows) {
      await pg.query(
        `insert into public.contract_entitlements (contract_id, module_id)
         values ($1, $2) on conflict do nothing`,
        [contractId, m.id],
      );
      console.log('entitled:', m.key);
    }

    console.log('OK — superadmin cũng có thể gán «Trợ lý AI» trên HĐ trong /platform');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
