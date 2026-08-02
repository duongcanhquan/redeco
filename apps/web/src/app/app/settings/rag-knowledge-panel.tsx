'use client';

import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FilePlus2,
  Library,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/platform/modal';
import { HelpTip } from '@/components/ui/help-tip';
import type { RagModuleKey } from '@optimake/domain';
import {
  defaultEmbeddingModelForProvider,
  providerSupportsEmbeddings,
  type AiProviderId,
} from '@/lib/ai-providers';
import type { AiRagSettings } from '@/services/tenant-settings.service';
import {
  archiveRagDocumentAction,
  createAndIngestRagDocumentAction,
  listRagDocumentsAction,
} from './rag-actions';
import { SettingsGroup } from './settings-group';

const MODULE_OPTIONS: { key: RagModuleKey; label: string }[] = [
  { key: 'chung', label: 'Chung — dùng mọi phân hệ (khuyên dùng)' },
  { key: 'kinh-doanh', label: 'Chỉ Kinh doanh' },
  { key: 'kho', label: 'Chỉ Kho' },
  { key: 'san-xuat', label: 'Chỉ Sản xuất' },
  { key: 'nhan-su', label: 'Chỉ Nhân sự' },
  { key: 'thiet-bi', label: 'Chỉ Thiết bị' },
];

type DocRow = {
  id: string;
  title: string;
  status: string;
  chunk_count: number;
  error_message: string | null;
  module_key?: string;
  collection_name?: string;
  created_at: string;
};

export function RagKnowledgePanel({
  rag,
  onRagChange,
  provider,
}: {
  rag: AiRagSettings;
  onRagChange: (next: AiRagSettings) => void;
  provider: AiProviderId;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [moduleKey, setModuleKey] = useState<RagModuleKey>('chung');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const embedOk = providerSupportsEmbeddings(provider);
  const suggestedEmbed = defaultEmbeddingModelForProvider(provider);
  const readyCount = docs.filter((d) => d.status === 'ready').length;

  const refreshDocs = async (): Promise<void> => {
    setLoadingDocs(true);
    const result = await listRagDocumentsAction();
    setLoadingDocs(false);
    if (result.ok) setDocs(result.data);
  };

  useEffect(() => {
    void refreshDocs();
  }, []);

  const submitDoc = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!embedOk) {
      setMsg({
        type: 'error',
        text: 'Provider hiện tại không hỗ trợ embeddings. Đổi sang OpenAI / Azure / DeepSeek / Mistral / Custom rồi Lưu.',
      });
      return;
    }
    setBusy(true);
    setMsg(null);
    const result = await createAndIngestRagDocumentAction({
      moduleKey,
      title,
      bodyText: body,
    });
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    onRagChange(result.data.rag);
    setMsg({
      type: 'ok',
      text: `Đã sẵn sàng (${result.data.chunkCount} đoạn). Hỏi AI trên hub sẽ dùng tri thức này.`,
    });
    setTitle('');
    setBody('');
    await refreshDocs();
    router.refresh();
  };

  const removeDoc = async (id: string): Promise<void> => {
    if (!window.confirm('Xóa tài liệu này khỏi tri thức AI?')) return;
    setBusy(true);
    const result = await archiveRagDocumentAction(id);
    setBusy(false);
    if (!result.ok) {
      setMsg({ type: 'error', text: result.error });
      return;
    }
    await refreshDocs();
  };

  return (
    <div className="space-y-5">
      <SettingsGroup
        title="Tri thức công ty (RAG)"
        description="Dán SOP một lần — AI hỏi đáp hiểu đúng quy trình của bạn. Không cần cài thêm phần mềm."
        icon={<BookOpen size={18} className="text-accent" aria-hidden />}
      >
        <ol className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <li className="flex items-start gap-2 rounded-xl border border-panel/40 bg-app/40 px-3 py-3 min-h-11">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent text-xs font-bold">
              1
            </span>
            <span>
              <span className="font-medium block">Lưu API key</span>
              <span className="text-xs text-ink-muted">Phía trên form AI</span>
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-panel/40 bg-app/40 px-3 py-3 min-h-11">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent text-xs font-bold">
              2
            </span>
            <span>
              <span className="font-medium block">Dán tài liệu</span>
              <span className="text-xs text-ink-muted">SOP / FAQ / quy trình</span>
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-xl border border-panel/40 bg-app/40 px-3 py-3 min-h-11">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent text-xs font-bold">
              3
            </span>
            <span>
              <span className="font-medium block">Hỏi AI trên hub</span>
              <span className="text-xs text-ink-muted">Tự lấy ngữ cảnh</span>
            </span>
          </li>
        </ol>

        {!embedOk && (
          <p role="alert" className="mb-3 text-sm text-warning rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
            Anthropic / Google chưa hỗ trợ embeddings trực tiếp. Chọn OpenAI, Azure, DeepSeek,
            Mistral hoặc Custom (OpenAI-compatible) rồi Lưu.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-2">
          <label className="inline-flex items-center gap-3 min-h-11 cursor-pointer">
            <input
              type="checkbox"
              className="size-4 accent-accent"
              checked={rag.ragEnabled}
              onChange={(e) => onRagChange({ ...rag, ragEnabled: e.target.checked })}
            />
            <span className="text-sm font-medium">Dùng tri thức khi hỏi đáp</span>
          </label>
          {rag.ragEnabled && readyCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
              <CheckCircle2 size={14} aria-hidden />
              {readyCount} tài liệu sẵn sàng
            </span>
          )}
          <HelpTip title="Easy Mode">
            <p>
              Khi bạn thêm tài liệu, hệ thống tự bật RAG và dùng model embedding phù hợp provider.
              Không cần Pinecone / pgvector / Docker.
            </p>
          </HelpTip>
        </div>
        <p className="text-xs text-ink-muted mb-3">
          Thêm tài liệu sẽ tự bật & lưu. Hoặc tick ô trên rồi bấm «Lưu» cuối form.
        </p>

        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-ink"
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((v) => !v)}
        >
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
            aria-hidden
          />
          Tuỳ chọn nâng cao
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field id="rag-embed" label="Model embedding">
              <input
                id="rag-embed"
                className={inputClass}
                value={rag.embeddingModel}
                onChange={(e) => onRagChange({ ...rag, embeddingModel: e.target.value })}
                placeholder={suggestedEmbed}
                list="rag-embed-hints"
              />
              <datalist id="rag-embed-hints">
                <option value="text-embedding-3-small" />
                <option value="text-embedding-3-large" />
                <option value="mistral-embed" />
              </datalist>
            </Field>
            <Field id="rag-chunk" label="Chunk size">
              <input
                id="rag-chunk"
                type="number"
                min={100}
                max={2000}
                className={inputClass}
                value={rag.chunkSize}
                onChange={(e) =>
                  onRagChange({ ...rag, chunkSize: Number(e.target.value) || 350 })
                }
              />
            </Field>
            <Field id="rag-overlap" label="Overlap">
              <input
                id="rag-overlap"
                type="number"
                min={0}
                max={500}
                className={inputClass}
                value={rag.chunkOverlap}
                onChange={(e) =>
                  onRagChange({ ...rag, chunkOverlap: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field id="rag-topk" label="Top-K">
              <input
                id="rag-topk"
                type="number"
                min={1}
                max={20}
                className={inputClass}
                value={rag.topK}
                onChange={(e) => onRagChange({ ...rag, topK: Number(e.target.value) || 6 })}
              />
            </Field>
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup
        title="Thêm tri thức"
        description="Chỉ cần dán nội dung. Tiêu đề để trống = lấy dòng đầu."
        icon={<Library size={18} className="text-accent" aria-hidden />}
      >
        <form onSubmit={(e) => void submitDoc(e)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="rag-mod" label="Áp dụng cho" required>
              <select
                id="rag-mod"
                className={inputClass}
                value={moduleKey}
                onChange={(e) => setModuleKey(e.target.value as RagModuleKey)}
              >
                {MODULE_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="rag-title" label="Tiêu đề" hint="Tuỳ chọn">
              <input
                id="rag-title"
                className={inputClass}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Để trống = dòng đầu nội dung"
              />
            </Field>
          </div>
          <Field id="rag-body" label="Nội dung" required hint="Tối thiểu 20 ký tự">
            <textarea
              id="rag-body"
              className={`${inputClass} min-h-40 text-base leading-relaxed`}
              required
              minLength={20}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Dán quy trình bảo trì, chính sách bán hàng, FAQ kho…"
            />
          </Field>
          <button
            type="submit"
            disabled={busy || !embedOk}
            className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-app disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : (
              <FilePlus2 size={16} aria-hidden />
            )}
            {busy ? 'Đang học tài liệu…' : 'Thêm vào tri thức'}
          </button>
        </form>

        {msg && (
          <p
            role="alert"
            className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-success' : 'text-danger'}`}
          >
            {msg.text}
          </p>
        )}

        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium text-ink-muted">Đã học</p>
          {loadingDocs ? (
            <p className="text-sm text-ink-muted flex items-center gap-2 min-h-11">
              <Loader2 size={16} className="animate-spin" aria-hidden /> Đang tải…
            </p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-ink-muted rounded-xl border border-dashed border-panel/50 px-4 py-6 text-center">
              Chưa có gì. Dán SOP ở trên — khoảng 30 giây là AI dùng được.
            </p>
          ) : (
            <ul className="divide-y divide-panel/30 rounded-xl border border-panel/40 overflow-hidden">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 bg-app/30 min-h-11"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-ink-muted">
                      {d.collection_name ?? d.module_key ?? '—'} ·{' '}
                      {d.status === 'ready'
                        ? `sẵn sàng · ${d.chunk_count} đoạn`
                        : d.status === 'failed'
                          ? `lỗi${d.error_message ? `: ${d.error_message}` : ''}`
                          : d.status}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Xóa ${d.title}`}
                    onClick={() => void removeDoc(d.id)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-panel/40 text-danger disabled:opacity-60"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsGroup>
    </div>
  );
}
