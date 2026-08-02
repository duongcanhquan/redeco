const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', 'apps', 'api', '.env');
const map = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) map[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!map.DIRECT_URL) {
  console.error('Missing DIRECT_URL');
  process.exit(1);
}
execSync(`pnpm exec supabase db push --db-url "${map.DIRECT_URL}"`, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
