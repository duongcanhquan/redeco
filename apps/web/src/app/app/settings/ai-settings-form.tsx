'use client';

import { Bot, KeyRound, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
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
    setMsg({ type: 'ok', text: 'Đã lưu.' });
    router.refresh();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <SettingsGroup
        title="Kết nối AI"
        icon={<KeyRound size={18} className="text-accent" aria-hidden />}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs rounded-lg px-2 py-1 bg-warning/15 text-warning font-medium">
            Đang lưu cấu hình
          </span>
          <HelpTip title="Trạng thái AI">
            <p>Điền nhà cung cấp + key trước. Các tính năng chat / dự báo sẽ chạy khi bật runtime (bước sau).</p>
            <p>Key đã lưu không hiện đủ — chỉ thấy dạng ••••.</p>
          </HelpTip>
        </div>
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
              <option value="custom">Tùy chỉnh</option>
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
          <Field id="ai-key" label="API Key">
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
          <Field id="ai-base" label="Địa chỉ API (nếu cần)">
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
        title="Tính năng muốn dùng"
        icon={<Sparkles size={18} className="text-accent" aria-hidden />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              ['copilot', 'Trợ lý hỏi đáp'],
              ['demandForecast', 'Dự báo nhu cầu'],
              ['nlpOrderParsing', 'Đọc đơn từ email/PDF'],
              ['churnScoring', 'Cảnh báo khách rời bỏ'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-xl border border-panel/40 bg-app/40 px-4 py-3 cursor-pointer min-h-11"
            >
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={features[key]}
                onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
              />
              <span className="text-sm font-medium flex-1">{label}</span>
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
