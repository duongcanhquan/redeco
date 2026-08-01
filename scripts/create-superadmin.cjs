// Tạo (hoặc cập nhật) tài khoản SUPERADMIN nền tảng.
// - Tạo user trong Supabase Auth (email confirmed) với app_metadata.is_platform_admin = true
// - Ghi vào bảng public.platform_admins
// Usage: node scripts/create-superadmin.cjs <email> <password> [full_name]
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
  const [email, password, fullName = 'Super Admin'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node scripts/create-superadmin.cjs <email> <password> [full_name]');
    process.exit(1);
  }

  const env = loadEnv(path.join(__dirname, '..', 'apps', 'api', '.env'));
  const base = env.SUPABASE_URL;
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // 1) Tạo user (hoặc lấy user có sẵn nếu email đã tồn tại)
  let userId = null;
  const createRes = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: { is_platform_admin: true },
      user_metadata: { full_name: fullName },
    }),
  });

  if (createRes.ok) {
    userId = (await createRes.json()).id;
    console.log(`Đã tạo user: ${email} (${userId})`);
  } else {
    const err = await createRes.json();
    if (!`${err.msg ?? err.message ?? ''}`.toLowerCase().includes('already')) {
      throw new Error(`Tạo user thất bại: ${JSON.stringify(err)}`);
    }
    // Email đã tồn tại -> tìm user và cập nhật claim + mật khẩu
    const listRes = await fetch(
      `${base}/auth/v1/admin/users?page=1&per_page=200`,
      { headers },
    );
    const { users } = await listRes.json();
    const existing = users.find((u) => u.email === email);
    if (!existing) throw new Error('Email đã tồn tại nhưng không tìm thấy user');
    userId = existing.id;
    const updRes = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        password,
        email_confirm: true,
        app_metadata: { ...existing.app_metadata, is_platform_admin: true },
      }),
    });
    if (!updRes.ok) throw new Error(`Cập nhật user thất bại: ${await updRes.text()}`);
    console.log(`User đã tồn tại — đã cập nhật claim superadmin + mật khẩu (${userId})`);
  }

  // 2) Ghi vào platform_admins
  const client = new Client({ connectionString: env.DIRECT_URL });
  await client.connect();
  await client.query(
    `insert into public.platform_admins (id, full_name)
     values ($1, $2)
     on conflict (id) do update set full_name = excluded.full_name`,
    [userId, fullName],
  );
  await client.end();
  console.log('Đã ghi vào platform_admins. Hoàn tất — đăng nhập tại /login.');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
