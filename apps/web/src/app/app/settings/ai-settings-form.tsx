'use client';

import {
  Bot,
  Factory,
  KeyRound,
  PlugZap,
  ShoppingCart,
  Sparkles,
  UserCog,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
import {
  AI_PROVIDERS,
  defaultEmbeddingModelForProvider,
  getAiProvider,
  type AiProviderId,
} from '@/lib/ai-providers';
import type { AiFeatureFlags, AiRagSettings, AiSettingsPublic } from '@/services/tenant-settings.service';
import { saveAiSettingsAction, testAiConnectionAction } from './actions';
import { RagKnowledgePanel } from './rag-knowledge-panel';
import { SettingsGroup } from './settings-group';

const SALES_FEATURE_OPTIONS: {
  key: keyof AiFeatureFlags;
  label: string;
  hint: string;
}[] = [
  {
    key: 'copilot',
    label: 'Hỏi đáp trên Tổng quan KD',
    hint: 'Nút «Hỏi AI» — tóm tắt KPI, hàng đợi, công nợ.',
  },
  {
    key: 'salesQuoteReview',
    label: 'Đánh giá báo giá',
    hint: 'Nút «AI đánh giá» trên chi tiết báo giá.',
  },
  {
    key: 'salesOrderReview',
    label: 'Đánh giá đơn hàng',
    hint: 'Nút «AI đánh giá» trên chi tiết đơn hàng.',
  },
];

const MODULE_FEATURE_OPTIONS: {
  key: keyof AiFeatureFlags;
  label: string;
  hint: string;
  icon: typeof Warehouse;
}[] = [
  {
    key: 'inventoryAsk',
    label: 'Hỏi đáp Kho',
    hint: 'Hub Kho — tồn thấp, phiếu gần đây, ATP.',
    icon: Warehouse,
  },
  {
    key: 'productionAsk',
    label: 'Hỏi đáp Sản xuất',
    hint: 'Hub SX — LSX mở, BOM.',
    icon: Factory,
  },
  {
    key: 'hrAsk',
    label: 'Hỏi đáp Nhân sự',
    hint: 'Hub NS — NV, HĐ sắp hết, chấm công.',
    icon: UserCog,
  },
  {
    key: 'equipmentAsk',
    label: 'Hỏi đáp Thiết bị',
    hint: 'Hub TB — máy, lệnh BT, OEE, meter.',
    icon: Wrench,
  },
];

const FUTURE_FEATURE_OPTIONS: {
  key: keyof AiFeatureFlags;
  label: string;
  hint: string;
}[] = [
  {
    key: 'demandForecast',
    label: 'Dự báo nhu cầu',
    hint: 'Lưu cấu hình — runtime sau (cần dữ liệu lịch sử).',
  },
  {
    key: 'nlpOrderParsing',
    label: 'Đọc đơn từ email/PDF',
    hint: 'Lưu cấu hình — runtime sau.',
  },
  {
    key: 'churnScoring',
    label: 'Cảnh báo khách rời bỏ',
    hint: 'Lưu cấu hình — runtime sau.',
  },
];

export function AiSettingsForm({ initial }: { initial: AiSettingsPublic }) {
  const router = useRouter();
  const [provider, setProvider] = useState<AiProviderId>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState(initial.apiKeyMasked ?? '');
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [features, setFeatures] = useState(initial.features);
  const [rag, setRag] = useState<AiRagSettings>(initial.rag);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const meta = getAiProvider(provider);

  const onProviderChange = (next: AiProviderId): void => {
    const def = getAiProvider(next);
    setProvider(next);
    if (def.defaultModel) setModel(def.defaultModel);
    if (def.defaultBaseUrl || next === 'custom') {
      setBaseUrl(def.defaultBaseUrl);
    } else if (!initial.baseUrl) {
      setBaseUrl('');
    }
    setRag((prev) => ({
      ...prev,
      embeddingModel: defaultEmbeddingModelForProvider(next),
    }));
  };

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const result = await saveAiSettingsAction({
      provider,
      model,
      apiKey,
      baseUrl,
      features,
      rag,
    });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu.' });
    router.refresh();
  };

  const testConnection = async (): Promise<void> => {
    setTesting(true);
    setMsg(null);
    const result = await testAiConnectionAction();
    setTesting(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: `Kết nối OK — ${result.data.reply}` });
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Kết nối AI"
        icon={<KeyRound size={18} className="text-accent" aria-hidden />}
      >
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs rounded-lg px-2 py-1 bg-accent-soft text-accent font-medium">
            Module Trợ lý AI đã được cấp
          </span>
          <span className="text-xs rounded-lg px-2 py-1 bg-warning/15 text-warning font-medium">
            Key chỉ dùng phía máy chủ
          </span>
          <HelpTip title="Hai lớp quyền">
            <p>
              Superadmin Optimake cấp module «Trợ lý AI» trên hợp đồng. Admin công ty cấu hình
              nhà cung cấp / key và bật từng chỗ dùng theo phân hệ bên dưới.
            </p>
          </HelpTip>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="ai-provider" label="Nhà cung cấp" required hint={meta.hint}>
            <select
              id="ai-provider"
              className={inputClass}
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as AiProviderId)}
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field id="ai-model" label="Model" required>
            <input
              id="ai-model"
              className={inputClass}
              required
              list="ai-model-hints"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={meta.defaultModel || 'tên-model'}
            />
            {meta.modelHints.length > 0 && (
              <datalist id="ai-model-hints">
                {meta.modelHints.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
          </Field>
          <Field id="ai-key" label="API Key">
            <input
              id="ai-key"
              type="password"
              autoComplete="off"
              className={`${inputClass} font-mono`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initial.hasApiKey ? '••••••••' : 'sk-… / AIza…'}
            />
          </Field>
          <Field
            id="ai-base"
            label="Địa chỉ API"
            hint={
              provider === 'custom'
                ? 'Bắt buộc với tùy chỉnh.'
                : 'Để trống nếu dùng endpoint mặc định.'
            }
          >
            <input
              id="ai-base"
              className={inputClass}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={meta.defaultBaseUrl || 'https://…'}
              required={provider === 'custom'}
            />
          </Field>
        </div>
        <div className="mt-3">
          <button
            type="button"
            disabled={testing || busy}
            onClick={() => void testConnection()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-panel/40 px-4 text-sm font-medium disabled:opacity-60"
          >
            <PlugZap size={16} aria-hidden />
            {testing ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
          </button>
          <p className="mt-1 text-xs text-ink-muted">
            Gửi ping ngắn tới provider (ghi vào nhật ký sử dụng). Lưu key trước nếu vừa đổi.
          </p>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Áp dụng trong Kinh doanh"
        description="Cần entitlement ai.kinh-doanh.* trên hợp đồng + API key."
        icon={<ShoppingCart size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 gap-3">
          {SALES_FEATURE_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11"
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-accent"
                checked={features[opt.key]}
                onChange={(e) => setFeatures({ ...features, [opt.key]: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="block text-xs text-ink-muted mt-0.5">{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Áp dụng Kho / SX / Nhân sự"
        description="Mỗi phân hệ cần entitlement ai.kho / ai.san-xuat / ai.nhan-su / ai.thiet-bi tương ứng."
        icon={<Warehouse size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 gap-3">
          {MODULE_FEATURE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <label
                key={opt.key}
                className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11"
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-accent"
                  checked={features[opt.key]}
                  onChange={(e) => setFeatures({ ...features, [opt.key]: e.target.checked })}
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon size={16} className="text-accent" aria-hidden />
                    {opt.label}
                  </span>
                  <span className="block text-xs text-ink-muted mt-0.5">{opt.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </SettingsGroup>

      <RagKnowledgePanel rag={rag} onRagChange={setRag} provider={provider} />

      <SettingsGroup
        title="Tính năng khác (chuẩn bị)"
        icon={<Sparkles size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FUTURE_FEATURE_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11"
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-accent"
                checked={features[opt.key]}
                onChange={(e) => setFeatures({ ...features, [opt.key]: e.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="block text-xs text-ink-muted mt-0.5">{opt.hint}</span>
              </span>
            </label>
          ))}
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
        className="inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app disabled:opacity-60"
      >
        <Bot size={18} aria-hidden />
        {busy ? 'Đang lưu…' : 'Lưu'}
      </button>
    </form>
  );
}
