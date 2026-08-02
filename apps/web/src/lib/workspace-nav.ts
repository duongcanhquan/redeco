/**
 * Điều hướng workspace theo chức danh (N2 + R2).
 * Pure helpers — không gọi DB.
 */

export type SalesTabKey =
  | 'tong-quan'
  | 'khach-hang'
  | 'san-pham'
  | 'bao-gia'
  | 'don-hang'
  | 'giao-hang'
  | 'hoa-don'
  | 'chiet-khau'
  | 'duyet'
  | 'customiz-redeco-rfq';

export type InventoryTabKey = 'tong-quan' | 'ton-kho' | 'phieu-kho' | 'danh-muc-kho';
export type ProductionTabKey = 'tong-quan' | 'dinh-muc' | 'lenh-sx';
export type AccountingTabKey = 'tong-quan';

export interface HubTabDef {
  key: string;
  label: string;
  /** Đường dẫn tương đối từ workspace (vd /sales/quotations) */
  path: string;
  /** Khớp active khi URL bắt đầu bằng một trong các prefix */
  matchPrefixes: string[];
}

/** Có đúng key, hoặc bất kỳ node con (vd kinh-doanh.bao-gia.tao-bao-gia). */
export function hasModuleKey(keys: readonly string[], target: string): boolean {
  return keys.some((k) => k === target || k.startsWith(`${target}.`));
}

/** Được giao đúng node gốc (không tính node con). */
export function hasExactModuleKey(keys: readonly string[], target: string): boolean {
  return keys.includes(target);
}

/** Có quyền phân hệ (root hoặc bất kỳ con). */
export function hasModuleBranch(keys: readonly string[], root: string): boolean {
  return hasModuleKey(keys, root);
}

const SALES_TAB_DEFS: Record<SalesTabKey, HubTabDef> = {
  'tong-quan': {
    key: 'tong-quan',
    label: 'Tổng quan',
    path: '/sales',
    matchPrefixes: ['/sales'],
  },
  'khach-hang': {
    key: 'khach-hang',
    label: 'Khách hàng',
    path: '/sales/customers',
    matchPrefixes: ['/sales/customers'],
  },
  'san-pham': {
    key: 'san-pham',
    label: 'Sản phẩm',
    path: '/sales/products',
    matchPrefixes: ['/sales/products'],
  },
  'bao-gia': {
    key: 'bao-gia',
    label: 'Báo giá',
    path: '/sales/quotations',
    matchPrefixes: ['/sales/quotations'],
  },
  'don-hang': {
    key: 'don-hang',
    label: 'Đơn hàng',
    path: '/sales/orders',
    matchPrefixes: ['/sales/orders'],
  },
  'giao-hang': {
    key: 'giao-hang',
    label: 'Giao hàng',
    path: '/sales/deliveries',
    matchPrefixes: ['/sales/deliveries'],
  },
  'hoa-don': {
    key: 'hoa-don',
    label: 'Hóa đơn',
    path: '/sales/invoices',
    matchPrefixes: ['/sales/invoices'],
  },
  'chiet-khau': {
    key: 'chiet-khau',
    label: 'Chiết khấu',
    path: '/sales/discount-rules',
    matchPrefixes: ['/sales/discount-rules'],
  },
  duyet: {
    key: 'duyet',
    label: 'Duyệt',
    path: '/sales/approvals',
    matchPrefixes: ['/sales/approvals'],
  },
  'customiz-redeco-rfq': {
    key: 'customiz-redeco-rfq',
    label: 'Yêu cầu BG · REDECO',
    path: '/sales/customiz/redeco-rfq',
    matchPrefixes: ['/sales/customiz/redeco-rfq'],
  },
};

/** Thứ tự hiển thị tab Kinh doanh. */
const SALES_TAB_ORDER: SalesTabKey[] = [
  'tong-quan',
  'khach-hang',
  'san-pham',
  'bao-gia',
  'customiz-redeco-rfq',
  'don-hang',
  'giao-hang',
  'hoa-don',
  'chiet-khau',
  'duyet',
];

/**
 * Tab Kinh doanh theo quyền.
 * Quản trị: đủ tab nếu có nhánh kinh-doanh.
 * Nhân viên: node con + phụ thuộc đọc (R2).
 */
export function resolveSalesTabs(
  moduleKeys: readonly string[],
  isManager: boolean,
): HubTabDef[] {
  if (!hasModuleBranch(moduleKeys, 'kinh-doanh')) return [];

  // Quản trị hoặc được giao ĐÚNG root kinh-doanh → đủ tab
  // (hasModuleKey('kinh-doanh') cũng khớp node con — KHÔNG dùng ở đây, nếu không R2 chết)
  const withCustomiz = (keys: SalesTabKey[]): HubTabDef[] => {
    const list = [...keys];
    // Customiz pack — chỉ hiện khi được cấp (kể cả quản trị)
    if (
      hasModuleKey(moduleKeys, 'customiz.kinh-doanh.redeco-rfq') ||
      hasModuleKey(moduleKeys, 'customiz.kinh-doanh') ||
      hasExactModuleKey(moduleKeys, 'customiz')
    ) {
      if (!list.includes('customiz-redeco-rfq')) {
        const baoGiaIdx = list.indexOf('bao-gia');
        if (baoGiaIdx >= 0) list.splice(baoGiaIdx + 1, 0, 'customiz-redeco-rfq');
        else list.push('customiz-redeco-rfq');
      }
    }
    return list.map((k) => SALES_TAB_DEFS[k]);
  };

  if (isManager || hasExactModuleKey(moduleKeys, 'kinh-doanh')) {
    const keys: SalesTabKey[] = [
      'tong-quan',
      'khach-hang',
      'san-pham',
      'bao-gia',
      'don-hang',
      'giao-hang',
      'hoa-don',
    ];
    if (isManager) {
      keys.push('chiet-khau', 'duyet');
    }
    return withCustomiz(keys);
  }

  const allowed = new Set<SalesTabKey>(['tong-quan']);

  if (hasModuleKey(moduleKeys, 'kinh-doanh.khach-hang')) allowed.add('khach-hang');
  if (hasModuleKey(moduleKeys, 'kinh-doanh.san-pham')) allowed.add('san-pham');
  if (hasModuleKey(moduleKeys, 'kinh-doanh.bao-gia')) {
    allowed.add('bao-gia');
    allowed.add('khach-hang');
    allowed.add('san-pham');
  }
  if (hasModuleKey(moduleKeys, 'kinh-doanh.don-hang')) {
    allowed.add('don-hang');
    allowed.add('khach-hang');
    allowed.add('san-pham');
  }
  if (hasModuleKey(moduleKeys, 'kinh-doanh.giao-hang')) {
    allowed.add('giao-hang');
    allowed.add('don-hang');
  }
  if (hasModuleKey(moduleKeys, 'kinh-doanh.hoa-don')) {
    allowed.add('hoa-don');
    allowed.add('don-hang');
  }
  if (hasModuleKey(moduleKeys, 'kinh-doanh.chiet-khau')) allowed.add('chiet-khau');
  if (hasModuleKey(moduleKeys, 'kinh-doanh.duyet')) allowed.add('duyet');

  return withCustomiz(SALES_TAB_ORDER.filter((k) => allowed.has(k)));
}

const INVENTORY_DEFS: Record<InventoryTabKey, HubTabDef> = {
  'tong-quan': {
    key: 'tong-quan',
    label: 'Tổng quan',
    path: '/inventory',
    matchPrefixes: ['/inventory'],
  },
  'ton-kho': {
    key: 'ton-kho',
    label: 'Tồn kho',
    path: '/inventory/stock',
    matchPrefixes: ['/inventory/stock'],
  },
  'phieu-kho': {
    key: 'phieu-kho',
    label: 'Phiếu kho',
    path: '/inventory/transactions',
    matchPrefixes: ['/inventory/transactions'],
  },
  'danh-muc-kho': {
    key: 'danh-muc-kho',
    label: 'Danh mục kho',
    path: '/inventory/warehouses',
    matchPrefixes: ['/inventory/warehouses'],
  },
};

export function resolveInventoryTabs(
  moduleKeys: readonly string[],
  isManager: boolean,
): HubTabDef[] {
  if (!hasModuleBranch(moduleKeys, 'kho')) return [];
  if (isManager || hasExactModuleKey(moduleKeys, 'kho')) {
    return [
      INVENTORY_DEFS['tong-quan'],
      INVENTORY_DEFS['ton-kho'],
      INVENTORY_DEFS['phieu-kho'],
      INVENTORY_DEFS['danh-muc-kho'],
    ];
  }
  const allowed = new Set<InventoryTabKey>(['tong-quan']);
  if (hasModuleKey(moduleKeys, 'kho.ton-kho')) allowed.add('ton-kho');
  if (hasModuleKey(moduleKeys, 'kho.phieu-kho')) allowed.add('phieu-kho');
  // Không có node riêng cho danh mục kho → chỉ khi có root hoặc quản trị
  const order: InventoryTabKey[] = ['tong-quan', 'ton-kho', 'phieu-kho', 'danh-muc-kho'];
  return order.filter((k) => allowed.has(k)).map((k) => INVENTORY_DEFS[k]);
}

const PRODUCTION_DEFS: Record<ProductionTabKey, HubTabDef> = {
  'tong-quan': {
    key: 'tong-quan',
    label: 'Tổng quan',
    path: '/production',
    matchPrefixes: ['/production'],
  },
  'dinh-muc': {
    key: 'dinh-muc',
    label: 'Định mức (BOM)',
    path: '/production/boms',
    matchPrefixes: ['/production/boms'],
  },
  'lenh-sx': {
    key: 'lenh-sx',
    label: 'Lệnh SX',
    path: '/production/work-orders',
    matchPrefixes: ['/production/work-orders'],
  },
};

export function resolveProductionTabs(moduleKeys: readonly string[]): HubTabDef[] {
  if (!hasModuleBranch(moduleKeys, 'san-xuat')) return [];
  // Chưa có node con trong catalog → đủ tab khi có nhánh
  return [
    PRODUCTION_DEFS['tong-quan'],
    PRODUCTION_DEFS['dinh-muc'],
    PRODUCTION_DEFS['lenh-sx'],
  ];
}

export function resolveAccountingTabs(moduleKeys: readonly string[]): HubTabDef[] {
  if (!hasModuleBranch(moduleKeys, 'ke-toan')) return [];
  return [
    {
      key: 'tong-quan',
      label: 'Tổng quan',
      path: '/accounting',
      matchPrefixes: ['/accounting'],
    },
  ];
}

/** Bỏ tiền tố /{slug} hoặc /app khỏi pathname để khớp matchPrefixes. */
export function stripWorkspaceBase(pathname: string, base: string): string {
  if (pathname === base) return '/';
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}

/**
 * Tab active: khớp prefix dài nhất (tránh /sales khớp mọi trang con).
 * Tổng quan /sales chỉ active khi path === /sales (không có đoạn con).
 * Ngoại lệ: /sales/huong-dan thuộc Tổng quan.
 */
export function resolveActiveTabKey(
  appPath: string,
  tabs: readonly HubTabDef[],
): string | null {
  if (
    (appPath === '/sales/huong-dan' || appPath.startsWith('/sales/huong-dan/')) &&
    tabs.some((t) => t.key === 'tong-quan')
  ) {
    return 'tong-quan';
  }

  let best: { key: string; len: number } | null = null;
  for (const tab of tabs) {
    for (const prefix of tab.matchPrefixes) {
      if (prefix === '/sales' || prefix === '/inventory' || prefix === '/production' || prefix === '/accounting') {
        if (appPath === prefix) {
          return tab.key;
        }
        continue;
      }
      if (appPath === prefix || appPath.startsWith(`${prefix}/`)) {
        if (!best || prefix.length > best.len) {
          best = { key: tab.key, len: prefix.length };
        }
      }
    }
  }
  return best?.key ?? null;
}

export function firstAllowedPath(tabs: readonly HubTabDef[]): string | null {
  return tabs[0]?.path ?? null;
}

export function isAppPathAllowed(appPath: string, tabs: readonly HubTabDef[]): boolean {
  if (tabs.length === 0) return false;
  if (resolveActiveTabKey(appPath, tabs) !== null) return true;
  // Cho phép đứng đúng hub gốc nếu có tab tong-quan
  return tabs.some((t) => t.key === 'tong-quan' && appPath === t.path);
}
