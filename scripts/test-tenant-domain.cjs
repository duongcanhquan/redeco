// Smoke test định tuyến theo tên miền công ty (/{slug}/...):
// đăng nhập demo@optimake.com, dựng cookie phiên như @supabase/ssr,
// rồi kiểm tra proxy ép mọi URL về đúng tên miền của công ty.
const fs = require('fs');
const path = require('path');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3110';

function loadEnv(file) {
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return map;
}

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf8').toString('base64url');
}

/** Dựng cookie header giống @supabase/ssr (prefix base64-, chunk 3180 ký tự). */
function sessionCookies(projectRef, session) {
  const value = 'base64-' + base64UrlEncode(JSON.stringify(session));
  const name = `sb-${projectRef}-auth-token`;
  const CHUNK = 3180;
  if (value.length <= CHUNK) return [`${name}=${value}`];
  const parts = [];
  for (let i = 0; i * CHUNK < value.length; i++) {
    parts.push(`${name}.${i}=${value.slice(i * CHUNK, (i + 1) * CHUNK)}`);
  }
  return parts;
}

async function main() {
  const env = loadEnv(path.join(__dirname, '..', 'apps', 'api', '.env'));
  const projectRef = new URL(env.SUPABASE_URL).hostname.split('.')[0];

  // 1) Đăng nhập user của công ty demo
  const login = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@optimake.com', password: 'Demo@123' }),
  });
  if (!login.ok) throw new Error(`Đăng nhập thất bại: ${login.status} ${await login.text()}`);
  const session = await login.json();
  console.log('Đăng nhập OK. tenant_slug =', session.user.app_metadata.tenant_slug);

  const cookie = sessionCookies(projectRef, session).join('; ');
  let pass = 0;
  let fail = 0;

  async function check(label, url, expect, cookieHeader = cookie) {
    const headers = cookieHeader ? { cookie: cookieHeader } : {};
    const res = await fetch(`${BASE}${url}`, { redirect: 'manual', headers });
    const loc = res.headers.get('location') || '';
    const ok =
      expect.status === res.status &&
      (expect.location === undefined || loc.endsWith(expect.location));
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${url} -> ${res.status} ${loc}`);
    if (ok) pass++;
    else {
      fail++;
      console.log(`     mong đợi: ${expect.status} ${expect.location ?? ''}`);
    }
  }

  await check('workspace dưới tên miền', '/demo', { status: 200 });
  await check('trang con dưới tên miền', '/demo/settings', { status: 200 });
  await check('/app bị ép về tên miền', '/app', { status: 307, location: '/demo' });
  await check('/app/... giữ nguyên path', '/app/sales/customers', {
    status: 307,
    location: '/demo/sales/customers',
  });
  await check('tên miền công ty khác bị chặn', '/redeco', { status: 307, location: '/demo' });
  await check('login chung khi đã đăng nhập', '/login', { status: 307, location: '/demo' });
  await check('login công ty khi đã đăng nhập', '/demo/login', { status: 307, location: '/demo' });

  // Khách chưa đăng nhập
  await check('URL chữ hoa tự về chữ thường', '/Demo', { status: 307, location: '/demo' }, '');
  await check('tên miền lạ vẫn ra trang login', '/khong-ton-tai/login', { status: 200 }, '');

  // Superadmin xem được trang login của công ty (link từ console)
  const saLogin = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@gmail.com', password: '123456' }),
  });
  if (saLogin.ok) {
    const saSession = await saLogin.json();
    const saCookie = sessionCookies(projectRef, saSession).join('; ');
    await check('superadmin mở login công ty', '/demo/login', { status: 200 }, saCookie);
    await check('superadmin vào workspace công ty -> /platform', '/demo', {
      status: 307,
      location: '/platform',
    }, saCookie);
  } else {
    console.log('SKIP superadmin (đăng nhập thất bại)');
  }

  // 2) RPC tên công ty công khai cho trang login
  const rpc = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/tenant_public_name`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: 'demo' }),
  });
  const name = await rpc.json();
  const rpcOk = rpc.ok && typeof name === 'string' && name.length > 0;
  console.log(`${rpcOk ? 'PASS' : 'FAIL'} RPC tenant_public_name('demo') = ${JSON.stringify(name)}`);
  rpcOk ? pass++ : fail++;

  console.log(`\nKết quả: ${pass} pass, ${fail} fail.`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
