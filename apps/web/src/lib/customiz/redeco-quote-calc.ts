/**
 * Stub engine tính BG REDECO — thay bằng công thức H4 khi có tài liệu.
 */

export type CalcOutput = {
  feasible: boolean;
  cost: number;
  price: number;
  currency: string;
  note: string;
  breakdown: { label: string; amount: number }[];
};

export function runStubQuoteCalc(input: {
  externalQuoteNo: string;
  attributes: Record<string, string>;
  profileConfig: Record<string, unknown>;
}): CalcOutput {
  const qtyRaw = input.attributes['qty_expected'] ?? '';
  const qty = Number.parseFloat(qtyRaw.replace(/,/g, '')) || 1;
  const unitCost =
    typeof input.profileConfig['default_unit_cost'] === 'number'
      ? input.profileConfig['default_unit_cost']
      : 0;
  const markup =
    typeof input.profileConfig['markup_pct'] === 'number'
      ? input.profileConfig['markup_pct']
      : 20;
  const cost = Math.round(unitCost * qty * 100) / 100;
  const price = Math.round(cost * (1 + markup / 100) * 100) / 100;
  return {
    feasible: true,
    cost,
    price,
    currency: 'VND',
    note: 'Kết quả stub — chờ công thức REDECO (H4). Có thể chỉnh giá khi tạo BG.',
    breakdown: [
      { label: 'Chi phí (stub)', amount: cost },
      { label: `Markup ${markup}%`, amount: price - cost },
    ],
  };
}
