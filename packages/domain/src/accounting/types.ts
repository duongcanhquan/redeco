export type ArInvoiceStatus = 'open' | 'partial' | 'paid' | 'void';

export function addPaymentTermsDays(issuedOn: string, termsDays: number): string {
  const d = new Date(`${issuedOn}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.floor(termsDays)));
  return d.toISOString().slice(0, 10);
}

/** Số ngày quá hạn (âm = chưa tới hạn). */
export function daysPastDue(dueOn: string, asOf: string): number {
  const due = Date.parse(`${dueOn}T00:00:00.000Z`);
  const now = Date.parse(`${asOf}T00:00:00.000Z`);
  if (!Number.isFinite(due) || !Number.isFinite(now)) return 0;
  return Math.floor((now - due) / 86_400_000);
}
