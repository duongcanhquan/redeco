import {
  Activity,
  Calculator,
  ClipboardList,
  Cpu,
  Factory,
  FileSpreadsheet,
  FileText,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Layers,
  Package,
  Percent,
  Receipt,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';

/** Icon Lucide theo key mục phân hệ — dùng sidebar (và chỗ khác nếu cần). */
export function hubTabIcon(key: string, size = 16): ReactNode {
  switch (key) {
    case 'tong-quan':
      return <LayoutDashboard size={size} aria-hidden />;
    case 'khach-hang':
      return <Users size={size} aria-hidden />;
    case 'san-pham':
      return <Package size={size} aria-hidden />;
    case 'bao-gia':
      return <FileText size={size} aria-hidden />;
    case 'kinh-doanh-redeco':
    case 'customiz-redeco-rfq':
      return <FileSpreadsheet size={size} aria-hidden />;
    case 'don-hang':
      return <ClipboardList size={size} aria-hidden />;
    case 'giao-hang':
      return <Truck size={size} aria-hidden />;
    case 'hoa-don':
      return <Receipt size={size} aria-hidden />;
    case 'chiet-khau':
      return <Percent size={size} aria-hidden />;
    case 'duyet':
      return <GitBranch size={size} aria-hidden />;
    case 'ton-kho':
      return <Package size={size} aria-hidden />;
    case 'phieu-kho':
      return <ClipboardList size={size} aria-hidden />;
    case 'danh-muc-kho':
      return <Warehouse size={size} aria-hidden />;
    case 'vi-tri-kho':
      return <Layers size={size} aria-hidden />;
    case 'phong-ban':
      return <GitBranch size={size} aria-hidden />;
    case 'nhan-vien':
      return <Users size={size} aria-hidden />;
    case 'ca-lam':
      return <ClipboardList size={size} aria-hidden />;
    case 'cham-cong':
      return <ClipboardList size={size} aria-hidden />;
    case 'nghi-phep':
      return <FileText size={size} aria-hidden />;
    case 'bang-luong':
      return <Receipt size={size} aria-hidden />;
    case 'dinh-muc':
      return <Layers size={size} aria-hidden />;
    case 'lenh-sx':
      return <Factory size={size} aria-hidden />;
    case 'thiet-bi':
      return <Cpu size={size} aria-hidden />;
    case 'yeu-cau':
      return <ClipboardList size={size} aria-hidden />;
    case 'lenh-bt':
      return <Wrench size={size} aria-hidden />;
    case 'ke-hoach-pm':
      return <ClipboardList size={size} aria-hidden />;
    case 'meter':
      return <Activity size={size} aria-hidden />;
    case 'oee':
      return <Gauge size={size} aria-hidden />;
    case 'ke_toan':
    case 'tong-quan-kt':
      return <Calculator size={size} aria-hidden />;
    default:
      return <LayoutDashboard size={size} aria-hidden />;
  }
}
