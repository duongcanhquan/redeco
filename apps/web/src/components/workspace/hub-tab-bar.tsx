'use client';

import {
  Calculator,
  ClipboardList,
  Factory,
  FileText,
  GitBranch,
  LayoutDashboard,
  Layers,
  Package,
  Percent,
  ScrollText,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { TabBar } from '@/components/platform/tab-bar';
import {
  firstAllowedPath,
  isAppPathAllowed,
  resolveActiveTabKey,
  stripWorkspaceBase,
  type HubTabDef,
} from '@/lib/workspace-nav';

const ICONS: Record<string, ReactNode> = {
  'tong-quan': <LayoutDashboard size={16} aria-hidden />,
  'khach-hang': <Users size={16} aria-hidden />,
  'san-pham': <Package size={16} aria-hidden />,
  'bao-gia': <FileText size={16} aria-hidden />,
  'don-hang': <ScrollText size={16} aria-hidden />,
  'giao-hang': <Truck size={16} aria-hidden />,
  'hoa-don': <FileText size={16} aria-hidden />,
  'chiet-khau': <Percent size={16} aria-hidden />,
  duyet: <GitBranch size={16} aria-hidden />,
  'ton-kho': <Package size={16} aria-hidden />,
  'phieu-kho': <ClipboardList size={16} aria-hidden />,
  'danh-muc-kho': <Warehouse size={16} aria-hidden />,
  'dinh-muc': <Layers size={16} aria-hidden />,
  'lenh-sx': <Factory size={16} aria-hidden />,
  ke_toan: <Calculator size={16} aria-hidden />,
};

export function HubTabBar({
  base,
  tabs,
}: {
  base: string;
  tabs: HubTabDef[];
}) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const appPath = stripWorkspaceBase(pathname, base);

  const tabSignature = tabs.map((t) => t.path).join('|');

  useEffect(() => {
    if (tabs.length === 0) return;
    if (isAppPathAllowed(appPath, tabs)) return;
    const fallback = firstAllowedPath(tabs);
    if (fallback) router.replace(`${base}${fallback}`);
    // tabSignature thay cho mảng tabs (tránh lặp vô hạn do reference mới mỗi lần render)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cố ý khóa theo chữ ký tab
  }, [appPath, base, router, tabSignature]);

  if (tabs.length === 0) return null;

  const activeKey = resolveActiveTabKey(appPath, tabs) ?? tabs[0]!.key;

  return (
    <TabBar
      activeKey={activeKey}
      items={tabs.map((t) => ({
        key: t.key,
        label: t.label,
        href: `${base}${t.path}`,
        icon: ICONS[t.key] ?? <LayoutDashboard size={16} aria-hidden />,
      }))}
    />
  );
}
