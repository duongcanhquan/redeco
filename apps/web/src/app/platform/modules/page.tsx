import { Boxes, Package, Puzzle } from 'lucide-react';
import { createServerSupabase } from '@/lib/supabase/server';
import {
  listModules,
  buildModuleTree,
  type ModuleTreeNode,
} from '@/services/platform.service';

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
          Cấu trúc cây: module → phần → tính năng. Hợp đồng cấp node nào, công ty được cả nhánh
          con của node đó.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tree.map((root) => (
          <section key={root.id} className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft border border-accent/25 text-accent">
                <Package size={19} aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">{root.name}</h2>
                <p className="text-xs text-ink-muted font-mono">{root.key}</p>
              </div>
            </div>
            {root.description && (
              <p className="text-sm text-ink-muted mb-3">{root.description}</p>
            )}
            {root.children.length > 0 ? (
              <ModuleBranch nodes={root.children} />
            ) : (
              <p className="text-xs text-ink-muted italic">Chưa có thành phần con.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function ModuleBranch({ nodes }: { nodes: ModuleTreeNode[] }) {
  return (
    <ul className="space-y-1.5 border-l border-panel/40 pl-4">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center gap-2 py-1">
            <Puzzle
              size={14}
              className={node.kind === 'feature' ? 'text-ink-muted' : 'text-accent'}
              aria-hidden
            />
            <span className="text-sm">{node.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                node.kind === 'feature'
                  ? 'bg-glass text-ink-muted'
                  : 'bg-accent-soft text-accent'
              }`}
            >
              {node.kind === 'feature' ? 'tính năng' : 'module'}
            </span>
          </div>
          {node.children.length > 0 && <ModuleBranch nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}
