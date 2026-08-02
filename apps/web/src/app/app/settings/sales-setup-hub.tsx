'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ExternalLink,
  GitBranch,
  Percent,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import {
  SYSTEM_PRESETS,
  buildChecklist,
  buildSetupWarnings,
  resolveActiveProfileLabel,
  type SalesCompanyProfile,
  type SalesSetupFlags,
  type SalesSetupPanel,
  SALES_SETUP_PANELS,
} from '@/lib/sales-setup';
import type { SalesSettings } from '@/services/tenant-settings.service';
import {
  applySalesCompanyProfileAction,
  applySalesPresetAction,
  deleteSalesCompanyProfileAction,
  saveSalesCompanyProfileAction,
  saveSalesDocsSettingsAction,
  saveSalesSetupFlagsAction,
  saveSalesStockPolicyAction,
} from './actions';
import { SettingsGroup } from './settings-group';

export interface SalesSetupHubProps {
  basePath: string;
  panel: SalesSetupPanel;
  sales: SalesSettings;
  inventory: {
    reserveOnSoConfirm: boolean;
    requireFullReserveOnConfirm: boolean;
  };
  flags: SalesSetupFlags;
  profiles: SalesCompanyProfile[];
  activeProfileId: string | null;
  hasDefaultWorkflow: boolean;
  defaultWorkflowName: string | null;
  activeDiscountRuleCount: number;
  hasKhoModule: boolean;
}

export function SalesSetupHub(props: SalesSetupHubProps) {
  const {
    basePath,
    panel,
    sales,
    inventory,
    flags,
    profiles,
    activeProfileId,
    hasDefaultWorkflow,
    defaultWorkflowName,
    activeDiscountRuleCount,
    hasKhoModule,
  } = props;

  const review = {
    currencyLabel: sales.currencyLabel,
    defaultQuotationValidDays: sales.defaultQuotationValidDays,
    debtWarningDays: sales.debtWarningDays,
    allowConfirmWithoutAtp: sales.allowConfirmWithoutAtp,
    reserveOnSoConfirm: inventory.reserveOnSoConfirm,
    requireFullReserveOnConfirm: inventory.requireFullReserveOnConfirm,
    flags,
    hasDefaultWorkflow,
    activeDiscountRuleCount,
    activeProfileId,
    companyProfileCount: profiles.length,
    hasKhoModule,
  };
  const checklist = buildChecklist(review);
  const warnings = buildSetupWarnings(review);
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const activeLabel = resolveActiveProfileLabel(activeProfileId, profiles);

  const panelHref = (p: SalesSetupPanel): string =>
    `${basePath}/settings?tab=sales&panel=${p}`;

  return (
    <div className="space-y-5">
      <nav
        aria-label="Phần cài đặt Kinh doanh"
        className="glass rounded-2xl p-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex gap-1 min-w-min">
          {SALES_SETUP_PANELS.map((p) => {
            const active = p.key === panel;
            return (
              <li key={p.key}>
                <Link
                  href={panelHref(p.key)}
                  className={`inline-flex min-h-11 items-center rounded-xl px-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-accent text-app'
                      : 'text-ink hover:bg-accent-soft/60 hover:text-accent'
                  }`}
                >
                  {p.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {panel === 'overview' && (
        <OverviewPanel
          pct={pct}
          doneCount={doneCount}
          total={checklist.length}
          activeLabel={activeLabel}
          checklist={checklist}
          warnings={warnings}
          panelHref={panelHref}
          basePath={basePath}
        />
      )}
      {panel === 'docs' && <DocsPanel initial={sales} />}
      {panel === 'stock' && (
        <StockPanel
          allowConfirmWithoutAtp={sales.allowConfirmWithoutAtp}
          reserveOnSoConfirm={inventory.reserveOnSoConfirm}
          requireFullReserveOnConfirm={inventory.requireFullReserveOnConfirm}
          hasKhoModule={hasKhoModule}
        />
      )}
      {panel === 'approval' && (
        <ApprovalPanel
          basePath={basePath}
          skipApproval={flags.skipApproval}
          hasDefaultWorkflow={hasDefaultWorkflow}
          defaultWorkflowName={defaultWorkflowName}
        />
      )}
      {panel === 'discount' && (
        <DiscountPanel
          basePath={basePath}
          skipDiscountRules={flags.skipDiscountRules}
          activeDiscountRuleCount={activeDiscountRuleCount}
        />
      )}
      {panel === 'delivery' && (
        <DeliveryPanel ack={flags.ackDeliveryInvoice} basePath={basePath} />
      )}
      {panel === 'profiles' && (
        <ProfilesPanel profiles={profiles} activeProfileId={activeProfileId} />
      )}
    </div>
  );
}

function OverviewPanel({
  pct,
  doneCount,
  total,
  activeLabel,
  checklist,
  warnings,
  panelHref,
  basePath,
}: {
  pct: number;
  doneCount: number;
  total: number;
  activeLabel: string;
  checklist: ReturnType<typeof buildChecklist>;
  warnings: ReturnType<typeof buildSetupWarnings>;
  panelHref: (p: SalesSetupPanel) => string;
  basePath: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const applyPreset = async (id: string): Promise<void> => {
    if (
      !window.confirm(
        'Áp preset sẽ ghi đè tham số Kinh doanh & giữ chỗ tồn đang dùng. Không xóa chứng từ / rule CK / workflow. Tiếp tục?',
      )
    ) {
      return;
    }
    setBusy(id);
    setMsg(null);
    const result = await applySalesPresetAction(id);
    setBusy(null);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã áp preset. Kiểm tra checklist các mục còn thiếu.' });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <SettingsGroup
        title="Tiến độ setup Kinh doanh"
        description="Hoàn tất checklist để vận hành ổn định. Có thể áp preset rồi chỉnh từng panel."
        icon={<Sparkles size={18} className="text-accent" aria-hidden />}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-ink">
            Đã xong {doneCount}/{total} · {pct}%
          </p>
          <span className="inline-flex min-h-9 items-center rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-ink">
            Đang dùng: {activeLabel}
          </span>
        </div>
        <div
          className="h-2.5 rounded-full bg-white/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Tiến độ setup"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SYSTEM_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy !== null}
              onClick={() => void applyPreset(p.id)}
              className="text-left rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3.5 hover:bg-accent/15 transition-colors min-h-11 disabled:opacity-60 cursor-pointer"
            >
              <span className="block text-sm font-bold text-accent">{p.name}</span>
              <span className="block text-xs text-ink-muted mt-1 leading-snug">
                {p.description}
              </span>
              <span className="block text-xs font-semibold text-ink mt-2">
                {busy === p.id ? 'Đang áp…' : 'Áp dụng preset'}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Link
            href={panelHref('profiles')}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline"
          >
            Quản lý profile công ty →
          </Link>
        </div>
        {msg && (
          <p
            role="alert"
            className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}
          >
            {msg.text}
          </p>
        )}
      </SettingsGroup>

      {warnings.length > 0 && (
        <div
          className="rounded-2xl border border-warning/40 bg-warning/10 p-4 space-y-2"
          role="status"
        >
          <p className="text-sm font-bold text-warning flex items-center gap-2">
            <AlertTriangle size={16} aria-hidden />
            Rà soát thông minh
          </p>
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li
                key={w.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-ink"
              >
                <span className="leading-snug">{w.message}</span>
                <Link
                  href={panelHref(w.panel)}
                  className="inline-flex min-h-11 items-center shrink-0 font-semibold text-accent"
                >
                  Sửa nhanh
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SettingsGroup title="Checklist" description="Bấm «Mở» để chỉnh đúng phần còn thiếu.">
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-3"
            >
              {item.done ? (
                <CheckCircle2 className="text-success shrink-0 mt-0.5" size={20} aria-hidden />
              ) : (
                <Circle className="text-ink-muted shrink-0 mt-0.5" size={20} aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{item.label}</p>
                <p className="text-sm text-ink-muted leading-snug">{item.hint}</p>
              </div>
              <Link
                href={panelHref(item.panel)}
                className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-accent shrink-0"
              >
                Mở
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-muted mt-3">
          Xem thêm{' '}
          <Link href={`${basePath}/sales/huong-dan`} className="text-accent font-semibold">
            Hướng dẫn dùng Kinh doanh
          </Link>
          .
        </p>
      </SettingsGroup>
    </div>
  );
}

function DocsPanel({ initial }: { initial: SalesSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveSalesDocsSettingsAction(form);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu tham số chứng từ.' });
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Chứng từ & hiển thị"
        description="Giá trị mặc định khi tạo báo giá / theo dõi công nợ — áp dụng toàn công ty."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="sales-currency" label="Nhãn tiền tệ hiển thị" required>
            <input
              id="sales-currency"
              className={inputClass}
              required
              value={form.currencyLabel}
              onChange={(e) => setForm({ ...form, currencyLabel: e.target.value })}
            />
          </Field>
          <Field
            id="sales-valid"
            label="Hiệu lực báo giá mặc định (ngày)"
            required
            hint="Gợi ý khi tạo báo giá mới."
          >
            <input
              id="sales-valid"
              type="number"
              min={1}
              max={365}
              className={inputClass}
              required
              value={form.defaultQuotationValidDays}
              onChange={(e) =>
                setForm({ ...form, defaultQuotationValidDays: Number(e.target.value) })
              }
            />
          </Field>
          <Field
            id="sales-debt"
            label="Cảnh báo tuổi nợ (ngày kể từ phát hành)"
            hint="0 = tắt cảnh báo."
          >
            <input
              id="sales-debt"
              type="number"
              min={0}
              max={365}
              className={inputClass}
              value={form.debtWarningDays}
              onChange={(e) => setForm({ ...form, debtWarningDays: Number(e.target.value) })}
            />
          </Field>
        </div>
      </SettingsGroup>
      {msg && (
        <p role="alert" className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        <Save size={16} aria-hidden />
        {busy ? 'Đang lưu…' : 'Lưu chứng từ'}
      </button>
    </form>
  );
}

function StockPanel({
  allowConfirmWithoutAtp,
  reserveOnSoConfirm,
  requireFullReserveOnConfirm,
  hasKhoModule,
}: {
  allowConfirmWithoutAtp: boolean;
  reserveOnSoConfirm: boolean;
  requireFullReserveOnConfirm: boolean;
  hasKhoModule: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    allowConfirmWithoutAtp,
    reserveOnSoConfirm,
    requireFullReserveOnConfirm,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveSalesStockPolicyAction(form);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu chính sách xác nhận & tồn.' });
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Xác nhận đơn & tồn"
        description="Chính sách khi bấm Xác nhận đơn hàng. Giữ chỗ đồng bộ với tab Kho."
      >
        {!hasKhoModule && (
          <p className="text-sm text-warning mb-3">
            Công ty chưa có module Kho — ATP / giữ chỗ chỉ có hiệu lực đầy đủ khi mở Kho.
          </p>
        )}
        <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11 mb-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={form.allowConfirmWithoutAtp}
            onChange={(e) => setForm({ ...form, allowConfirmWithoutAtp: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium">
              Cho phép xác nhận đơn khi ATP thiếu hàng
            </span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Bật = giao sau / chờ sản xuất. Tắt = chặn confirm nếu tồn không đủ.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11 mb-3">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={form.reserveOnSoConfirm}
            onChange={(e) =>
              setForm({
                ...form,
                reserveOnSoConfirm: e.target.checked,
                requireFullReserveOnConfirm: e.target.checked
                  ? form.requireFullReserveOnConfirm
                  : false,
              })
            }
          />
          <span>
            <span className="block text-sm font-medium">Giữ chỗ tồn khi xác nhận đơn</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Trừ ATP ngay khi confirm (kho thành phẩm). Cần module Kho.
            </span>
          </span>
        </label>
        <label
          className={`flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 min-h-11 ${
            form.reserveOnSoConfirm ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            disabled={!form.reserveOnSoConfirm}
            checked={form.requireFullReserveOnConfirm}
            onChange={(e) =>
              setForm({ ...form, requireFullReserveOnConfirm: e.target.checked })
            }
          />
          <span>
            <span className="block text-sm font-medium">
              Bắt buộc giữ chỗ đủ 100% mới cho xác nhận
            </span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Chỉ bật khi đã bật giữ chỗ. Thiếu hàng → không confirm được.
            </span>
          </span>
        </label>
      </SettingsGroup>
      {msg && (
        <p role="alert" className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        <Save size={16} aria-hidden />
        {busy ? 'Đang lưu…' : 'Lưu chính sách tồn'}
      </button>
    </form>
  );
}

function ApprovalPanel({
  basePath,
  skipApproval,
  hasDefaultWorkflow,
  defaultWorkflowName,
}: {
  basePath: string;
  skipApproval: boolean;
  hasDefaultWorkflow: boolean;
  defaultWorkflowName: string | null;
}) {
  const router = useRouter();
  const [skip, setSkip] = useState(skipApproval);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const save = async (): Promise<void> => {
    setBusy(true);
    setMsg(null);
    const result = await saveSalesSetupFlagsAction({ skipApproval: skip });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu tùy chọn duyệt.' });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <SettingsGroup
        title="Duyệt báo giá"
        description="Quy trình N cấp chỉnh chi tiết ở màn Quy trình duyệt. Tại đây đánh dấu nếu công ty không cần duyệt."
        icon={<GitBranch size={18} className="text-accent" aria-hidden />}
      >
        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 mb-3">
          <p className="text-sm font-bold text-ink">
            {hasDefaultWorkflow
              ? `Quy trình mặc định: ${defaultWorkflowName ?? '—'}`
              : 'Chưa có quy trình mặc định'}
          </p>
          <p className="text-sm text-ink-muted mt-1">
            Thêm bước, ngưỡng tiền, gán role duyệt trên trang chuyên biệt.
          </p>
          <Link
            href={`${basePath}/sales/approvals`}
            className="inline-flex min-h-11 items-center gap-1.5 mt-2 text-sm font-semibold text-accent"
          >
            Mở Quy trình duyệt
            <ExternalLink size={14} aria-hidden />
          </Link>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={skip}
            onChange={(e) => setSkip(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">Công ty không cần duyệt báo giá</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Đánh dấu checklist «đã xong». Workflow trong hệ thống vẫn có thể tồn tại — kiểm tra
              trang Duyệt nếu muốn tắt hẳn.
            </span>
          </span>
        </label>
      </SettingsGroup>
      {msg && (
        <p role="alert" className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.text}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        {busy ? 'Đang lưu…' : 'Lưu tùy chọn duyệt'}
      </button>
    </div>
  );
}

function DiscountPanel({
  basePath,
  skipDiscountRules,
  activeDiscountRuleCount,
}: {
  basePath: string;
  skipDiscountRules: boolean;
  activeDiscountRuleCount: number;
}) {
  const router = useRouter();
  const [skip, setSkip] = useState(skipDiscountRules);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const save = async (): Promise<void> => {
    setBusy(true);
    setMsg(null);
    const result = await saveSalesSetupFlagsAction({ skipDiscountRules: skip });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu tùy chọn chiết khấu.' });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <SettingsGroup
        title="Chiết khấu / khuyến mãi"
        description="Rule tự áp khi tạo báo giá. Cấu hình chi tiết trên trang chuyên biệt."
        icon={<Percent size={18} className="text-accent" aria-hidden />}
      >
        <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 mb-3">
          <p className="text-sm font-bold text-ink">
            Đang có {activeDiscountRuleCount} quy tắc đang bật
          </p>
          <Link
            href={`${basePath}/sales/discount-rules`}
            className="inline-flex min-h-11 items-center gap-1.5 mt-2 text-sm font-semibold text-accent"
          >
            Mở Chiết khấu / KM
            <ExternalLink size={14} aria-hidden />
          </Link>
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-accent"
            checked={skip}
            onChange={(e) => setSkip(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">Bỏ qua bước chiết khấu (không dùng rule)</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              Đánh dấu checklist hoàn tất nếu công ty không cần KM tự động.
            </span>
          </span>
        </label>
      </SettingsGroup>
      {msg && (
        <p role="alert" className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.text}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        {busy ? 'Đang lưu…' : 'Lưu tùy chọn chiết khấu'}
      </button>
    </div>
  );
}

function DeliveryPanel({ ack, basePath }: { ack: boolean; basePath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const acknowledge = async (): Promise<void> => {
    setBusy(true);
    setMsg(null);
    const result = await saveSalesSetupFlagsAction({ ackDeliveryInvoice: true });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã ghi nhận — checklist Giao & HĐ hoàn tất.' });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <SettingsGroup
        title="Giao hàng & hóa đơn"
        description="Vòng giao và xuất hóa đơn linh hoạt theo trạng thái đơn. Chi tiết thao tác nằm ở menu Kinh doanh."
      >
        <ul className="text-sm text-ink space-y-2 list-disc pl-5 leading-relaxed">
          <li>
            Tạo phiếu giao từ đơn đã xác nhận — xem{' '}
            <Link href={`${basePath}/sales/deliveries`} className="text-accent font-semibold">
              Giao hàng
            </Link>
            .
          </li>
          <li>
            Xuất hóa đơn khi đơn đã xác nhận / đang giao / hoàn tất — xem{' '}
            <Link href={`${basePath}/sales/invoices`} className="text-accent font-semibold">
              Hóa đơn
            </Link>
            .
          </li>
          <li>
            Giữ chỗ tồn được nhả / tiêu thụ khi giao (nếu đã bật giữ chỗ ở panel Xác nhận & tồn).
          </li>
        </ul>
        {ack ? (
          <p className="mt-4 text-sm font-semibold text-success flex items-center gap-2">
            <CheckCircle2 size={16} aria-hidden />
            Đã xác nhận đã xem chính sách giao / hóa đơn.
          </p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void acknowledge()}
            className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
          >
            {busy ? 'Đang lưu…' : 'Tôi đã hiểu — đánh dấu hoàn tất'}
          </button>
        )}
        {msg && (
          <p
            role="alert"
            className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}
          >
            {msg.text}
          </p>
        )}
      </SettingsGroup>
    </div>
  );
}

function ProfilesPanel({
  profiles,
  activeProfileId,
}: {
  profiles: SalesCompanyProfile[];
  activeProfileId: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const saveNew = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveSalesCompanyProfileAction({ name, description });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setName('');
    setDescription('');
    setMsg({ type: 'ok', text: 'Đã lưu profile từ cấu hình hiện tại.' });
    router.refresh();
  };

  const apply = async (id: string): Promise<void> => {
    if (
      !window.confirm(
        'Áp profile sẽ ghi đè tham số đang dùng (không xóa chứng từ / rule / workflow). Tiếp tục?',
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const result = await applySalesCompanyProfileAction(id);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã áp profile.' });
    router.refresh();
  };

  const overwrite = async (id: string, n: string, d: string): Promise<void> => {
    if (!window.confirm(`Ghi đè snapshot «${n}» bằng cấu hình đang dùng?`)) return;
    setBusy(true);
    setMsg(null);
    const result = await saveSalesCompanyProfileAction({ id, name: n, description: d });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã cập nhật snapshot profile.' });
    router.refresh();
  };

  const remove = async (id: string, n: string): Promise<void> => {
    if (!window.confirm(`Xóa profile «${n}»?`)) return;
    setBusy(true);
    setMsg(null);
    const result = await deleteSalesCompanyProfileAction(id);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã xóa profile.' });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <SettingsGroup
        title="Preset hệ thống"
        description="Áp nhanh bộ tham số mẫu — vẫn chỉnh tay sau đó."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SYSTEM_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  if (
                    !window.confirm(
                      'Áp preset sẽ ghi đè tham số đang dùng. Tiếp tục?',
                    )
                  ) {
                    return;
                  }
                  setBusy(true);
                  setMsg(null);
                  const result = await applySalesPresetAction(p.id);
                  setBusy(false);
                  if (!result.ok) {
                    setMsg({ type: 'error', text: result.error });
                    return;
                  }
                  setMsg({ type: 'ok', text: `Đã áp «${p.name}».` });
                  router.refresh();
                })();
              }}
              className="text-left rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3.5 hover:bg-accent/15 min-h-11 disabled:opacity-60 cursor-pointer"
            >
              <span className="block text-sm font-bold text-accent">{p.name}</span>
              <span className="block text-xs text-ink-muted mt-1">{p.hint}</span>
            </button>
          ))}
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Profile công ty"
        description="Lưu snapshot cấu hình hiện tại để áp lại sau. Tối đa 20 profile."
      >
        <form onSubmit={(e) => void saveNew(e)} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Field id="profile-name" label="Tên profile" required>
            <input
              id="profile-name"
              className={inputClass}
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Nhà máy Bắc"
            />
          </Field>
          <Field id="profile-desc" label="Mô tả (tuỳ chọn)">
            <input
              id="profile-desc"
              className={inputClass}
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-12 items-center rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
            >
              {busy ? 'Đang lưu…' : 'Lưu cấu hình hiện tại thành profile mới'}
            </button>
          </div>
        </form>

        {profiles.length === 0 ? (
          <p className="text-sm text-ink-muted">Chưa có profile công ty.</p>
        ) : (
          <ul className="space-y-2">
            {profiles.map((p) => {
              const active =
                activeProfileId === `profile:${p.id}` || activeProfileId === p.id;
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">
                      {p.name}
                      {active && (
                        <span className="ml-2 text-xs font-semibold text-accent">đang dùng</span>
                      )}
                    </p>
                    {p.description && (
                      <p className="text-xs text-ink-muted mt-0.5">{p.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void apply(p.id)}
                      className="inline-flex min-h-11 items-center rounded-lg border border-accent/40 px-3 text-xs font-semibold text-accent cursor-pointer disabled:opacity-60"
                    >
                      Áp dụng
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void overwrite(p.id, p.name, p.description)}
                      className="inline-flex min-h-11 items-center rounded-lg border border-white/25 px-3 text-xs font-semibold text-ink cursor-pointer disabled:opacity-60"
                    >
                      Ghi đè từ hiện tại
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(p.id, p.name)}
                      aria-label={`Xóa profile ${p.name}`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-danger/40 text-danger cursor-pointer disabled:opacity-60"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsGroup>
      {msg && (
        <p role="alert" className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
