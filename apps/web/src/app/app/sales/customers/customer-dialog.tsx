'use client';

import { AlertCircle, UserPlus, UserRoundPen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CustomerKind, CustomerStatus } from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import type { CustomerRow } from '@/services/sales.service';
import { createCustomerAction, updateCustomerAction } from './actions';

const KIND_OPTIONS: { value: CustomerKind; label: string }[] = [
  { value: 'b2b', label: 'B2B — Doanh nghiệp' },
  { value: 'b2c', label: 'B2C — Cá nhân' },
  { value: 'dai-ly', label: 'Đại lý / Nhà phân phối' },
];

export function CustomerDialog({
  customer,
  trigger,
}: {
  customer?: CustomerRow;
  trigger?: 'icon';
}) {
  const router = useRouter();
  const editing = Boolean(customer);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(customer?.name ?? '');
  const [kind, setKind] = useState<CustomerKind>(customer?.kind ?? 'b2b');
  const [taxCode, setTaxCode] = useState(customer?.tax_code ?? '');
  const [creditLimit, setCreditLimit] = useState(
    customer?.credit_limit === null || customer?.credit_limit === undefined
      ? ''
      : String(customer.credit_limit),
  );
  const [phone, setPhone] = useState(customer?.attributes.phone ?? '');
  const [email, setEmail] = useState(customer?.attributes.email ?? '');
  const [address, setAddress] = useState(customer?.attributes.address ?? '');
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? 'active');

  const submit = async (): Promise<void> => {
    setError(null);
    const limit = creditLimit.trim() === '' ? null : Number(creditLimit);
    if (limit !== null && (!Number.isFinite(limit) || limit < 0)) {
      setError('Hạn mức tín dụng phải là số không âm (bỏ trống = không giới hạn).');
      return;
    }
    setSaving(true);
    const input = { name, kind, taxCode, creditLimit: limit, phone, email, address };
    const result = customer
      ? await updateCustomerAction(customer.id, { ...input, status })
      : await createCustomerAction(input);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      {editing ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Sửa khách hàng ${customer?.name}`}
          className={
            trigger === 'icon'
              ? 'grid size-9 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong hover:text-ink transition-colors cursor-pointer'
              : 'h-9 rounded-xl border border-panel/60 px-3 text-sm text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer'
          }
        >
          <UserRoundPen size={16} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-app text-sm cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)]"
        >
          <UserPlus size={17} aria-hidden />
          Thêm khách hàng
        </button>
      )}

      <Modal
        title={editing ? `Sửa khách hàng — ${customer?.code}` : 'Thêm khách hàng'}
        icon={<UserPlus size={18} className="text-accent" aria-hidden />}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <Field id="cus-name" label="Tên khách hàng / công ty" required>
            <input
              id="cus-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Công ty TNHH ABC"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="cus-kind" label="Phân loại" required>
              <select
                id="cus-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as CustomerKind)}
                className={inputClass}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="cus-tax" label="Mã số thuế">
              <input
                id="cus-tax"
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className={inputClass}
                placeholder="0312345678"
              />
            </Field>
          </div>

          <Field
            id="cus-limit"
            label="Hạn mức tín dụng (đ)"
            hint="Bỏ trống = không giới hạn. Đơn hàng sẽ bị chặn xác nhận nếu công nợ + giá trị đơn vượt hạn mức."
          >
            <input
              id="cus-limit"
              type="number"
              min={0}
              step="1000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className={inputClass}
              placeholder="500000000"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="cus-phone" label="Điện thoại">
              <input
                id="cus-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="0901 234 567"
              />
            </Field>
            <Field id="cus-email" label="Email">
              <input
                id="cus-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="lienhe@abc.vn"
              />
            </Field>
          </div>

          <Field id="cus-address" label="Địa chỉ">
            <input
              id="cus-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder="123 Nguyễn Văn Linh, Q.7, TP.HCM"
            />
          </Field>

          {editing && (
            <Field id="cus-status" label="Trạng thái">
              <select
                id="cus-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                className={inputClass}
              >
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngưng giao dịch</option>
              </select>
            </Field>
          )}

          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm text-danger">
              <AlertCircle size={16} aria-hidden />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl border border-panel/60 px-4 text-sm text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-xl bg-accent px-5 text-sm font-semibold text-app cursor-pointer transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo khách hàng'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
