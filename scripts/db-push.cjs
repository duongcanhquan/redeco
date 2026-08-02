const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadEnv(file) {
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return map;
}

const env = loadEnv(path.join(__dirname, '..', 'apps', 'api', '.env'));
if (!env.DIRECT_URL) {
  console.error('DIRECT_URL missing in apps/api/.env');
  process.exit(1);
}
execSync(`pnpm exec supabase db push --yes --db-url ${JSON.stringify(env.DIRECT_URL)}`, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
