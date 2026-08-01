// Inspect remote Supabase schema: tables, columns, RLS, policies, migration history
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
  const client = new Client({ connectionString: env.DIRECT_URL });
  await client.connect();

  const tables = await client.query(`
    select t.table_name,
           (select relrowsecurity from pg_class c
             join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = t.table_name) as rls_enabled
    from information_schema.tables t
    where t.table_schema = 'public' and t.table_type = 'BASE TABLE'
    order by t.table_name`);
  console.log('=== TABLES (public) ===');
  for (const r of tables.rows) console.log(`${r.table_name}  rls=${r.rls_enabled}`);

  for (const r of tables.rows) {
    const cols = await client.query(
      `select column_name, data_type, is_nullable, column_default
       from information_schema.columns
       where table_schema='public' and table_name=$1 order by ordinal_position`,
      [r.table_name],
    );
    console.log(`\n--- ${r.table_name} ---`);
    for (const c of cols.rows)
      console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''} ${c.column_default ?? ''}`);
  }

  const policies = await client.query(
    `select tablename, policyname, cmd, roles from pg_policies where schemaname='public' order by tablename, policyname`,
  );
  console.log('\n=== POLICIES ===');
  for (const p of policies.rows) console.log(`${p.tablename}.${p.policyname} [${p.cmd}] roles=${p.roles}`);

  const funcs = await client.query(
    `select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1`,
  );
  console.log('\n=== FUNCTIONS (public) ===');
  for (const f of funcs.rows) console.log(`  ${f.proname}`);

  const mig = await client.query(`
    select coalesce(
      (select json_agg(version order by version)
         from supabase_migrations.schema_migrations), '[]'::json) as versions`).catch(() => null);
  console.log('\n=== MIGRATION HISTORY ===');
  console.log(mig ? JSON.stringify(mig.rows[0].versions) : '(no supabase_migrations schema)');

  const counts = await client.query(
    `select (select count(*) from public.tenants) as tenants_count`).catch(() => null);
  if (counts) console.log(`\ntenants rows: ${counts.rows[0].tenants_count}`);

  await client.end();
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
