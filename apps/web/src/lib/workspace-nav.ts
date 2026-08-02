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
  | 'kinh-doanh-redeco';

export type InventoryTabKey =
  | 'tong-quan'
  | 'ton-kho'
  | 'phieu-kho'
  | 'danh-muc-kho'
  | 'vi-tri-kho';
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

/** Hub Kinh doanh.REDECO (+ alias Customiz cũ). */
export function hasRedecoHubAccess(moduleKeys: readonly string[]): boolean {
  return (
    hasModuleKey(moduleKeys, 'kinh-doanh.redeco') ||
    hasModuleKey(moduleKeys, 'customiz.kinh-doanh.redeco-rfq') ||
    hasModuleKey(moduleKeys, 'customiz.kinh-doanh') ||
    hasExactModuleKey(moduleKeys, 'customiz')
  );
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
  'kinh-doanh-redeco': {
    key: 'kinh-doanh-redeco',
    label: 'Kinh doanh.REDECO',
    path: '/sales/redeco',
    matchPrefixes: ['/sales/redeco', '/sales/customiz/redeco-rfq'],
  },
};

/** Thứ tự hiển thị tab Kinh doanh. */
const SALES_TAB_ORDER: SalesTabKey[] = [
  'tong-quan',
  'khach-hang',
  'san-pham',
  'bao-gia',
  'kinh-doanh-redeco',
  'don-hang',
  'giao-hang',
  'hoa-don',
  'chiet-khau',
  'duyet',
];

function withRedecoHub(
  keys: SalesTabKey[],
  moduleKeys: readonly string[],
): HubTabDef[] {
  const list = [...keys];
  if (hasRedecoHubAccess(moduleKeys) && !list.includes('kinh-doanh-redeco')) {
    const baoGiaIdx = list.indexOf('bao-gia');
    if (baoGiaIdx >= 0) list.splice(baoGiaIdx + 1, 0, 'kinh-doanh-redeco');
    else list.push('kinh-doanh-redeco');
  }
  return list.map((k) => SALES_TAB_DEFS[k]);
}

/**
 * Tab Kinh doanh theo entitlement hợp đồng (không mở hết tab vì là admin).
 * Chỉ entitle `kinh-doanh.redeco` → chỉ hiện hub REDECO (+ tong-quan nếu có root KD).
 */
export function resolveSalesTabs(
  moduleKeys: readonly string[],
  isManager: boolean,
): HubTabDef[] {
  const hasKd =
    hasModuleBranch(moduleKeys, 'kinh-doanh') || hasRedecoHubAccess(moduleKeys);
  if (!hasKd) return [];

  const hasFullRoot = hasExactModuleKey(moduleKeys, 'kinh-doanh');

  if (hasFullRoot) {
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
    return withRedecoHub(keys, moduleKeys);
  }

  const allowed = new Set<SalesTabKey>();

  // Có nhánh KD chuẩn (không chỉ redeco) → thêm tổng quan
  const hasStandardChild =
    hasModuleKey(moduleKeys, 'kinh-doanh.khach-hang') ||
    hasModuleKey(moduleKeys, 'kinh-doanh.san-pham') ||
    hasModuleKey(moduleKeys, 'kinh-doanh.bao-gia') ||
    hasModuleKey(moduleKeys, 'kinh-doanh.don-hang') ||
    hasModuleKey(moduleKeys, 'kinh-doanh.giao-hang') ||
    hasModuleKey(moduleKeys, 'kinh-doanh.hoa-don') ||
    hasModuleKey(moduleKeys, 'kinh-doanh.chiet-khau') ||
    hasModuleKey(moduleKeys, 'kinh-doanh.duyet');

  if (hasStandardChild) {
    allowed.add('tong-quan');
  }

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

  const ordered = SALES_TAB_ORDER.filter((k) => allowed.has(k));
  return withRedecoHub(ordered, moduleKeys);
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
  'vi-tri-kho': {
    key: 'vi-tri-kho',
    label: 'Vị trí (Bin)',
    path: '/inventory/locations',
    matchPrefixes: ['/inventory/locations'],
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
      INVENTORY_DEFS['vi-tri-kho'],
      INVENTORY_DEFS['phieu-kho'],
      INVENTORY_DEFS['danh-muc-kho'],
    ];
  }
  const allowed = new Set<InventoryTabKey>(['tong-quan']);
  if (hasModuleKey(moduleKeys, 'kho.ton-kho')) allowed.add('ton-kho');
  if (hasModuleKey(moduleKeys, 'kho.phieu-kho')) allowed.add('phieu-kho');
  const order: InventoryTabKey[] = [
    'tong-quan',
    'ton-kho',
    'vi-tri-kho',
    'phieu-kho',
    'danh-muc-kho',
  ];
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

export type HrTabKey =
  | 'tong-quan'
  | 'phong-ban'
  | 'nhan-vien'
  | 'ca-lam'
  | 'cham-cong'
  | 'nghi-phep'
  | 'bang-luong';

const HR_DEFS: Record<HrTabKey, HubTabDef> = {
  'tong-quan': {
    key: 'tong-quan',
    label: 'Tổng quan',
    path: '/hr',
    matchPrefixes: ['/hr'],
  },
  'phong-ban': {
    key: 'phong-ban',
    label: 'Phòng ban',
    path: '/hr/departments',
    matchPrefixes: ['/hr/departments'],
  },
  'nhan-vien': {
    key: 'nhan-vien',
    label: 'Nhân viên',
    path: '/hr/employees',
    matchPrefixes: ['/hr/employees'],
  },
  'ca-lam': {
    key: 'ca-lam',
    label: 'Ca làm',
    path: '/hr/shifts',
    matchPrefixes: ['/hr/shifts'],
  },
  'cham-cong': {
    key: 'cham-cong',
    label: 'Chấm công',
    path: '/hr/attendance',
    matchPrefixes: ['/hr/attendance'],
  },
  'nghi-phep': {
    key: 'nghi-phep',
    label: 'Nghỉ phép',
    path: '/hr/leave',
    matchPrefixes: ['/hr/leave'],
  },
  'bang-luong': {
    key: 'bang-luong',
    label: 'Bảng lương',
    path: '/hr/payroll',
    matchPrefixes: ['/hr/payroll'],
  },
};

export function resolveHrTabs(moduleKeys: readonly string[]): HubTabDef[] {
  if (!hasModuleBranch(moduleKeys, 'nhan-su')) return [];
  return [
    HR_DEFS['tong-quan'],
    HR_DEFS['phong-ban'],
    HR_DEFS['nhan-vien'],
    HR_DEFS['ca-lam'],
    HR_DEFS['cham-cong'],
    HR_DEFS['nghi-phep'],
    HR_DEFS['bang-luong'],
  ];
}

export type EquipmentTabKey =
  | 'tong-quan'
  | 'thiet-bi'
  | 'yeu-cau'
  | 'lenh-bt'
  | 'ke-hoach-pm'
  | 'meter'
  | 'oee';

const EQUIPMENT_DEFS: Record<EquipmentTabKey, HubTabDef> = {
  'tong-quan': {
    key: 'tong-quan',
    label: 'Tổng quan',
    path: '/equipment',
    matchPrefixes: ['/equipment'],
  },
  'thiet-bi': {
    key: 'thiet-bi',
    label: 'Thiết bị',
    path: '/equipment/assets',
    matchPrefixes: ['/equipment/assets'],
  },
  'yeu-cau': {
    key: 'yeu-cau',
    label: 'Yêu cầu',
    path: '/equipment/requests',
    matchPrefixes: ['/equipment/requests'],
  },
  'lenh-bt': {
    key: 'lenh-bt',
    label: 'Lệnh BT',
    path: '/equipment/orders',
    matchPrefixes: ['/equipment/orders'],
  },
  'ke-hoach-pm': {
    key: 'ke-hoach-pm',
    label: 'Kế hoạch PM',
    path: '/equipment/plans',
    matchPrefixes: ['/equipment/plans'],
  },
  meter: {
    key: 'meter',
    label: 'Meter / PdM',
    path: '/equipment/meters',
    matchPrefixes: ['/equipment/meters'],
  },
  oee: {
    key: 'oee',
    label: 'OEE',
    path: '/equipment/oee',
    matchPrefixes: ['/equipment/oee'],
  },
};

export function resolveEquipmentTabs(moduleKeys: readonly string[]): HubTabDef[] {
  if (!hasModuleBranch(moduleKeys, 'thiet-bi')) return [];
  return [
    EQUIPMENT_DEFS['tong-quan'],
    EQUIPMENT_DEFS['thiet-bi'],
    EQUIPMENT_DEFS['yeu-cau'],
    EQUIPMENT_DEFS['lenh-bt'],
    EQUIPMENT_DEFS['ke-hoach-pm'],
    EQUIPMENT_DEFS.meter,
    EQUIPMENT_DEFS.oee,
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
      if (
        prefix === '/sales' ||
        prefix === '/inventory' ||
        prefix === '/production' ||
        prefix === '/accounting' ||
        prefix === '/hr' ||
        prefix === '/equipment'
      ) {
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
  return tabs.some((t) => t.key === 'tong-quan' && appPath === t.path);
}
