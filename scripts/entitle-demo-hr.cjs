/**
 * Gán module `nhan-su` vào hợp đồng active tenant demo.
 * node scripts/entitle-demo-hr.cjs
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
      `select id, key from public.modules where key = 'nhan-su' or key like 'nhan-su.%'`,
    );
    if (mods.rows.length === 0) throw new Error('Chưa seed module nhan-su');

    for (const m of mods.rows) {
      await pg.query(
        `insert into public.contract_entitlements (contract_id, module_id)
         values ($1, $2) on conflict do nothing`,
        [contractId, m.id],
      );
      console.log('entitled:', m.key);
    }

    const owner = await pg.query(
      `select id from public.user_profiles where tenant_id = $1 and role = 'owner' limit 1`,
      [tenantId],
    );
    if (owner.rows[0]) {
      for (const m of mods.rows) {
        await pg.query(
          `insert into public.user_module_assignments (tenant_id, user_id, module_id, access_level)
           values ($1, $2, $3, 'manage')
           on conflict (user_id, module_id) do update set access_level = 'manage'`,
          [tenantId, owner.rows[0].id, m.id],
        );
      }
      console.log('assigned owner manage on nhan-su');
    }

    console.log('OK — mở /demo/hr');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
