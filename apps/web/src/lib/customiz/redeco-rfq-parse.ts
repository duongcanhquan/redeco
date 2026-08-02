/**
 * Parse Excel yêu cầu báo giá REDECO (Customiz).
 * Header = dòng 5; data từ dòng 6. Hỗ trợ .xls / .xlsx qua SheetJS.
 */

import * as XLSX from 'xlsx';

/** Pack hub Kinh doanh.REDECO (ghi mới). */
export const REDECO_PACK_KEY = 'kinh-doanh.redeco' as const;
/** Alias legacy P1–P2 — vẫn đọc được sau migrate. */
export const REDECO_PACK_KEY_LEGACY = 'customiz.kinh-doanh.redeco-rfq' as const;
export const REDECO_PACK_KEYS: readonly string[] = [
  REDECO_PACK_KEY,
  REDECO_PACK_KEY_LEGACY,
];
/** @deprecated Dùng REDECO_PACK_KEY — giữ tên cũ cho import hiện có. */
export const REDECO_RFQ_PACK_KEY = REDECO_PACK_KEY;

/** 0-based index của dòng header (dòng 5 Excel). */
export const HEADER_ROW_INDEX = 4;

export const ATTR_KEYS = [
  'status_customer',
  'buyer_contact',
  'end_customer',
  'customer_site_abbr',
  'customer_item_code',
  'system_item_code',
  'request_quote_ref',
  'product_name',
  'model_or_end_code',
  'spec',
  'manufacturer',
  'uom',
  'qty_expected',
  'po_qty_last_year',
  'request_date',
  'quotation_closing_date',
  'closing_time',
] as const;

export type RedecoRfqAttrKey = (typeof ATTR_KEYS)[number];

export type ParsedRedecoRfqRow = {
  /** Số dòng Excel 1-based */
  sourceRow: number;
  externalQuoteNo: string;
  attributes: Record<RedecoRfqAttrKey, string>;
};

export type ParseRedecoRfqResult = {
  rows: ParsedRedecoRfqRow[];
  errors: { sourceRow: number; message: string }[];
  /** Số BG xuất hiện >1 lần trong file (normalized) */
  inBatchDuplicates: Set<string>;
};

function cellStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function isRowEmpty(cells: unknown[]): boolean {
  return cells.every((c) => cellStr(c) === '');
}

/** Normalize số báo giá để so trùng. */
export function normalizeQuoteNo(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Parse workbook buffer. Không ghi DB — chỉ map cột A–R.
 */
export function parseRedecoRfqWorkbook(buffer: ArrayBuffer | Buffer): ParseRedecoRfqResult {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return {
      rows: [],
      errors: [{ sourceRow: 0, message: 'File không có sheet.' }],
      inBatchDuplicates: new Set(),
    };
  }
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return {
      rows: [],
      errors: [{ sourceRow: 0, message: 'Không đọc được sheet.' }],
      inBatchDuplicates: new Set(),
    };
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(
    sheet,
    { header: 1, defval: '', raw: false },
  );

  const header = matrix[HEADER_ROW_INDEX];
  if (!header || cellStr(header[0]).length === 0) {
    return {
      rows: [],
      errors: [
        {
          sourceRow: 5,
          message: 'Không thấy dòng tiêu đề (dòng 5). Cột A phải là «Báo giá số».',
        },
      ],
      inBatchDuplicates: new Set(),
    };
  }

  const rows: ParsedRedecoRfqRow[] = [];
  const errors: { sourceRow: number; message: string }[] = [];
  const seen = new Map<string, number>();
  const inBatchDuplicates = new Set<string>();

  for (let i = HEADER_ROW_INDEX + 1; i < matrix.length; i++) {
    const excelRow = i + 1;
    const cells = matrix[i] ?? [];
    const slice = Array.from({ length: 18 }, (_, col) => cells[col] ?? '');
    if (isRowEmpty(slice)) continue;

    const quoteNo = normalizeQuoteNo(cellStr(slice[0]));
    if (!quoteNo) {
      errors.push({
        sourceRow: excelRow,
        message: 'Thiếu Số báo giá (cột A).',
      });
      continue;
    }

    const prev = seen.get(quoteNo);
    if (prev !== undefined) {
      inBatchDuplicates.add(quoteNo);
    } else {
      seen.set(quoteNo, excelRow);
    }

    const attributes = {
      status_customer: cellStr(slice[1]),
      buyer_contact: cellStr(slice[2]),
      end_customer: cellStr(slice[3]),
      customer_site_abbr: cellStr(slice[4]),
      customer_item_code: cellStr(slice[5]),
      system_item_code: cellStr(slice[6]),
      request_quote_ref: cellStr(slice[7]),
      product_name: cellStr(slice[8]),
      model_or_end_code: cellStr(slice[9]),
      spec: cellStr(slice[10]),
      manufacturer: cellStr(slice[11]),
      uom: cellStr(slice[12]),
      qty_expected: cellStr(slice[13]),
      po_qty_last_year: cellStr(slice[14]),
      request_date: cellStr(slice[15]),
      quotation_closing_date: cellStr(slice[16]),
      closing_time: cellStr(slice[17]),
    } satisfies Record<RedecoRfqAttrKey, string>;

    rows.push({ sourceRow: excelRow, externalQuoteNo: quoteNo, attributes });
  }

  return { rows, errors, inBatchDuplicates };
}

/** Gắn tag `trung` theo trùng trong batch + tập số BG đã có trên DB. */
export function tagRowsForDuplicates(
  rows: readonly ParsedRedecoRfqRow[],
  inBatchDuplicates: ReadonlySet<string>,
  existingQuoteNos: ReadonlySet<string>,
): { externalQuoteNo: string; tags: string[]; attributes: Record<string, string>; sourceRow: number }[] {
  return rows.map((r) => {
    const tags: string[] = [];
    if (inBatchDuplicates.has(r.externalQuoteNo) || existingQuoteNos.has(r.externalQuoteNo)) {
      tags.push('trung');
    }
    return {
      externalQuoteNo: r.externalQuoteNo,
      tags,
      attributes: { ...r.attributes },
      sourceRow: r.sourceRow,
    };
  });
}
