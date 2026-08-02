/**
 * Smoke: schema K2+K3 + RPC tồn tại trên remote.
 * Chạy: node scripts/test-inventory-k2-k3-schema.cjs
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
    const tables = await pg.query(`
      select table_name from information_schema.tables
      where table_schema = 'public'
        and table_name in ('warehouse_locations','inventory_lots','stock_quants')
      order by 1
    `);
    const names = tables.rows.map((r) => r.table_name);
    for (const t of ['warehouse_locations', 'inventory_lots', 'stock_quants']) {
      if (!names.includes(t)) throw new Error(`missing table ${t}`);
    }

    const cols = await pg.query(`
      select column_name from information_schema.columns
      where table_schema='public' and table_name='inventory_items'
        and column_name in ('track_lot','pick_strategy')
    `);
    if (cols.rows.length < 2) throw new Error('inventory_items missing track_lot/pick_strategy');

    const fns = await pg.query(`
      select proname from pg_proc
      where proname in ('inventory_apply_quant','inventory_rollup_balance')
    `);
    const fnNames = fns.rows.map((r) => r.proname);
    if (!fnNames.includes('inventory_apply_quant')) {
      throw new Error('missing inventory_apply_quant');
    }
    if (!fnNames.includes('inventory_rollup_balance')) {
      throw new Error('missing inventory_rollup_balance');
    }

    const defaults = await pg.query(`
      select count(*)::int as n from public.warehouse_locations where code = '__DEFAULT__'
    `);
    console.log(
      `PASS inventory K2+K3 schema (tables OK, RPC OK, default bins=${defaults.rows[0].n})`,
    );
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
