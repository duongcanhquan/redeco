import { redirect } from 'next/navigation';

/** Hợp đồng đã gộp vào trang Khách hàng (tab Hợp đồng). */
export default function ContractsRedirect() {
  redirect('/platform/companies?tab=contracts');
}
