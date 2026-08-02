'use client';

import { AlertCircle, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type {
  EmploymentContractStatus,
  EmploymentContractType,
} from '@optimake/domain';
import { Field, Modal, inputClass } from '@/components/platform/modal';
import { createContractAction } from '../../actions';

export function ContractDialog({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractType, setContractType] =
    useState<EmploymentContractType>('definite');
  const [status, setStatus] = useState<EmploymentContractStatus>('active');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [baseSalary, setBaseSalary] = useState('');

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const salary = baseSalary.trim() ? Number(baseSalary) : null;
    if (salary !== null && !(salary >= 0)) {
      setBusy(false);
      setError('Lương cơ bản không hợp lệ.');
      return;
    }
    const result = await createContractAction({
      employeeId,
      contractType,
      status,
      startsOn,
      endsOn: endsOn || null,
      baseSalary: salary,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-panel/40 px-4 text-sm font-medium cursor-pointer"
      >
        <Plus size={16} aria-hidden />
        Thêm hợp đồng
      </button>
      <Modal
        title="Hợp đồng lao động"
        icon={<Plus size={18} className="text-accent" aria-hidden />}
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
          <Field id="ct-type" label="Loại HĐ" required>
            <select
              id="ct-type"
              value={contractType}
              onChange={(e) =>
                setContractType(e.target.value as EmploymentContractType)
              }
              className={inputClass}
            >
              <option value="probation">Thử việc</option>
              <option value="definite">Xác định thời hạn</option>
              <option value="indefinite">Không xác định TH</option>
              <option value="seasonal">Thời vụ</option>
              <option value="other">Khác</option>
            </select>
          </Field>
          <Field id="ct-status" label="Trạng thái" required>
            <select
              id="ct-status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as EmploymentContractStatus)
              }
              className={inputClass}
            >
              <option value="draft">Nháp</option>
              <option value="active">Hiệu lực</option>
              <option value="expired">Hết hạn</option>
              <option value="terminated">Chấm dứt</option>
            </select>
          </Field>
          <Field id="ct-start" label="Bắt đầu" required>
            <input
              id="ct-start"
              type="date"
              required
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="ct-end" label="Kết thúc">
            <input
              id="ct-end"
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="ct-salary" label="Lương cơ bản (tham chiếu)">
            <input
              id="ct-salary"
              type="number"
              min={0}
              step="any"
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className={inputClass}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-danger flex items-center gap-2">
              <AlertCircle size={16} aria-hidden />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-xl bg-accent font-semibold text-app disabled:opacity-60"
          >
            {busy ? 'Đang lưu…' : 'Lưu HĐ'}
          </button>
        </form>
      </Modal>
    </>
  );
}
