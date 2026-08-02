'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  firstAllowedPath,
  isAppPathAllowed,
  stripWorkspaceBase,
  type HubTabDef,
} from '@/lib/workspace-nav';

/**
 * Giữ redirect khi URL không thuộc tab được phép — không render UI
 * (menu ngang HubTabBar đã bỏ; điều hướng chỉ còn sidebar).
 */
export function HubRouteGuard({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- khóa theo chữ ký tab
  }, [appPath, base, router, tabSignature]);

  return null;
}
