// Kiểm tra các truy vấn lồng PostgREST mà console dùng.
const fs = require('fs');
const path = require('path');

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
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const q1 =
    '/rest/v1/tenants?select=id,name,slug,status,attributes,created_at,user_profiles(count)';
  const r1 = await fetch(env.SUPABASE_URL + q1, { headers });
  console.log('tenants + member count:', r1.status, JSON.stringify(await r1.json()).slice(0, 250));

  const q2 = '/rest/v1/contracts?select=id,code,tenants(name),contract_entitlements(modules(name))';
  const r2 = await fetch(env.SUPABASE_URL + q2, { headers });
  console.log('contracts + modules:', r2.status, JSON.stringify(await r2.json()).slice(0, 250));
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
