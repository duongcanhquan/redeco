import { Settings2 } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { listSettings } from '@/services/platform.service';
import { SettingEditor } from './setting-editor';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const settings = await listSettings(supabase);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="text-accent" size={24} aria-hidden />
          Tham số hệ thống
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Các biến cấu hình toàn nền tảng — superadmin điều chỉnh mà không cần deploy.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settings.map((s) => (
          <section key={s.key} className="glass rounded-2xl p-5">
            <p className="font-mono text-sm text-accent">{s.key}</p>
            {s.description && <p className="mt-1 text-sm text-ink-muted">{s.description}</p>}
            <SettingEditor setting={s} />
          </section>
        ))}
      </div>
    </div>
  );
}
