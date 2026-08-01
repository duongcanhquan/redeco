import { Boxes } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildModuleTree, listModules } from '@/services/platform.service';
import { ModuleCatalogView } from './module-catalog-view';

export const dynamic = 'force-dynamic';

export default async function ModulesPage() {
  const supabase = await createServerSupabase();
  const tree = buildModuleTree(await listModules(supabase));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Boxes className="text-accent" size={24} aria-hidden />
          Danh mục module
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          Danh mục CHỈ ĐỌC — cấu trúc cây: module → phần → tính năng. Việc gán module cho từng
          công ty thực hiện ở trang <strong>Công ty</strong> (nút “Gán module”).
        </p>
      </header>

      <ModuleCatalogView tree={tree} />
    </div>
  );
}
