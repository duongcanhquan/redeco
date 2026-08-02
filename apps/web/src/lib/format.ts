/** Định dạng tiền theo nhãn tenant (settings.currencyLabel, mặc định VND). */
export function formatMoney(n: number, currencyLabel = 'VND'): string {
  const amount = new Intl.NumberFormat('vi-VN').format(Number(n));
  const label = currencyLabel.trim() || 'VND';
  return `${amount} ${label}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

/** Số ngày lịch từ `issuedOn` (YYYY-MM-DD) đến hôm nay. */
export function daysSinceDate(issuedOn: string | null | undefined): number {
  if (!issuedOn) return 0;
  const start = new Date(`${issuedOn.slice(0, 10)}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000));
}

/**
 * Hóa đơn unpaid quá ngưỡng cấu hình (debtWarningDays kể từ issued_on).
 * debtWarningDays = 0 → không cảnh báo tuổi nợ.
 */
export function isDebtOverdue(
  issuedOn: string,
  status: string,
  debtWarningDays: number,
): boolean {
  if (status !== 'unpaid' || debtWarningDays <= 0) return false;
  return daysSinceDate(issuedOn) >= debtWarningDays;
}
