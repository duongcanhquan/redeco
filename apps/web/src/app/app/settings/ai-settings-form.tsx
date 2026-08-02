'use client';

import { Bot, KeyRound, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import type { AiSettingsPublic } from '@/services/tenant-settings.service';
import { saveAiSettingsAction } from './actions';
import { SettingsGroup } from './settings-group';

export function AiSettingsForm({ initial }: { initial: AiSettingsPublic }) {
  const router = useRouter();
  const [provider, setProvider] = useState(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState(initial.apiKeyMasked ?? '');
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [features, setFeatures] = useState(initial.features);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

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
    });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    setMsg({ type: 'ok', text: 'Đã lưu cấu hình AI.' });
    router.refresh();
  };

  const featureToggle = (
    key: keyof AiSettingsPublic['features'],
    label: string,
    hint: string,
  ) => (
    <label className="flex items-start gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11">
      <input
        type="checkbox"
        className="mt-1 size-4 accent-accent shrink-0"
        checked={features[key]}
        onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-muted mt-0.5">{hint}</span>
      </span>
    </label>
  );

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Kết nối API AI"
        description="Chìa khóa và model dùng cho Copilot, dự báo, bóc tách đơn… Chỉ quản trị công ty được sửa. Key không bao giờ hiển thị đầy đủ sau khi lưu."
        icon={<KeyRound size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="ai-provider" label="Nhà cung cấp" required>
            <select
              id="ai-provider"
              className={inputClass}
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiSettingsPublic['provider'])}
            >
              <option value="openai">OpenAI</option>
              <option value="azure">Azure OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">Custom (OpenAI-compatible)</option>
            </select>
          </Field>
          <Field id="ai-model" label="Model" required>
            <input
              id="ai-model"
              className={inputClass}
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </Field>
          <Field
            id="ai-key"
            label="API Key"
            hint={
              initial.hasApiKey
                ? 'Đã lưu key. Để giữ nguyên thì không sửa ô này; nhập key mới để thay thế.'
                : 'Dán API key từ nhà cung cấp. Lưu ý bảo mật — chỉ admin công ty thấy.'
            }
          >
            <input
              id="ai-key"
              type="password"
              autoComplete="off"
              className={`${inputClass} font-mono`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initial.hasApiKey ? '••••••••' : 'sk-…'}
            />
          </Field>
          <Field id="ai-base" label="Base URL (tuỳ chọn)" hint="Bắt buộc với Azure / custom endpoint.">
            <input
              id="ai-base"
              className={inputClass}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
        </div>
      </SettingsGroup>

      <SettingsGroup
        title="Tính năng AI bật cho công ty"
        description="Bật từng khả năng khi đã sẵn sàng vận hành. Tắt = ẩn/không gọi API (tiết kiệm chi phí)."
        icon={<Sparkles size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {featureToggle('copilot', 'ERP Copilot', 'Chat hỏi đáp dữ liệu kinh doanh bằng ngôn ngữ tự nhiên.')}
          {featureToggle(
            'demandForecast',
            'Dự báo nhu cầu',
            'Phân tích mùa vụ / lịch sử để gợi ý kế hoạch.',
          )}
          {featureToggle(
            'nlpOrderParsing',
            'Bóc tách đơn từ email/PDF',
            'LLM + OCR map vào đơn hàng (sắp dùng đầy đủ).',
          )}
          {featureToggle(
            'churnScoring',
            'Chấm điểm / cảnh báo rời bỏ',
            'Cờ đỏ khách hàng theo hành vi mua & công nợ.',
          )}
        </div>
      </SettingsGroup>

      {msg && (
        <p
          role="alert"
          className={`text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app cursor-pointer disabled:opacity-60"
      >
        <Bot size={18} aria-hidden />
        {busy ? 'Đang lưu…' : 'Lưu cấu hình AI'}
      </button>
    </form>
  );
}
