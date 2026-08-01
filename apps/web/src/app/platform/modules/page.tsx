import { redirect } from 'next/navigation';

/** Danh mục module đã gộp vào trang Khách hàng (tab Danh mục module). */
export default function ModulesRedirect() {
  redirect('/platform/companies?tab=modules');
}
