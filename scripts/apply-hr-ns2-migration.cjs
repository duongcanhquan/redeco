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
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260802230000_hr_module_ns2.sql'),
    'utf8',
  );
  const pg = new Client({ connectionString: env.DIRECT_URL });
  await pg.connect();
  try {
    await pg.query(sql);
    console.log('OK applied HR NS2 migration');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
