export function formatMoney(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Number(n)) + ' đ';
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}
