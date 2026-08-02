'use client';

import { Bot, Loader2, MessageSquareText, Send, Sparkles, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

type AskResult =
  | { ok: true; data: { answer: string } }
  | { ok: false; error: string };

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function ModuleAiAskPanel({
  basePath,
  title,
  subtitle,
  entitled,
  configured,
  featureEnabled,
  disabledReason,
  suggestions,
  askAction,
}: {
  basePath: string;
  title: string;
  subtitle: string;
  entitled: boolean;
  configured: boolean;
  featureEnabled: boolean;
  disabledReason: string;
  suggestions: readonly string[];
  askAction: (question: string) => Promise<AskResult>;
}) {
  const titleId = useId();
  const inputId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = entitled && configured && featureEnabled;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy, error]);

  const ask = async (q: string): Promise<void> => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setQuestion(text);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    const result = await askAction(text);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: 'assistant', content: result.data.answer },
    ]);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app hover:opacity-95 transition-opacity"
      >
        <Sparkles size={18} aria-hidden />
        Hỏi AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            aria-label="Đóng"
            className="absolute inset-0 bg-app/75 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[101] flex h-[100dvh] w-full flex-col overflow-hidden border border-panel/50 bg-app-deep shadow-2xl sm:h-[min(88dvh,44rem)] sm:max-w-3xl sm:rounded-2xl md:max-w-5xl"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-panel/40 px-4 py-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <Bot size={22} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-lg font-bold">
                  {title}
                </h2>
                <p className="truncate text-sm text-ink-muted">{subtitle}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng hội thoại"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong"
              >
                <X size={22} aria-hidden />
              </button>
            </header>

            {!ready ? (
              <div className="flex flex-1 items-center justify-center p-5">
                <div className="w-full max-w-lg space-y-3 rounded-2xl border border-warning/40 bg-warning/10 px-5 py-5">
                  <p className="text-lg font-semibold text-warning">Chưa sẵn sàng hỏi AI</p>
                  <p className="text-ink-muted leading-relaxed">
                    {!entitled
                      ? 'Chưa cấp module / tính năng AI trên hợp đồng.'
                      : !configured
                        ? 'Quản trị chưa lưu API key.'
                        : disabledReason}
                  </p>
                  {entitled && (
                    <Link
                      href={`${basePath}/settings?tab=ai`}
                      className="inline-flex min-h-11 items-center font-semibold text-accent"
                    >
                      Mở Cài đặt AI →
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)]">
                <aside className="border-b border-panel/40 md:border-b-0 md:border-r">
                  <div className="flex items-center gap-2 border-b border-panel/30 px-4 py-3">
                    <Zap size={16} className="text-accent" aria-hidden />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Câu hỏi nhanh
                    </h3>
                  </div>
                  <ul className="flex gap-2 overflow-x-auto p-3 md:flex-col md:overflow-y-auto">
                    {suggestions.map((s) => (
                      <li key={s} className="min-w-[12rem] shrink-0 md:min-w-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void ask(s)}
                          className="flex w-full min-h-11 items-start gap-2 rounded-xl border border-panel/40 px-3 py-2.5 text-left text-sm hover:border-accent/40 disabled:opacity-50"
                        >
                          <MessageSquareText size={16} className="mt-0.5 text-accent shrink-0" aria-hidden />
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </aside>
                <div className="flex min-h-0 flex-1 flex-col">
                  <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    {messages.length === 0 && !busy && !error && (
                      <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 text-center text-ink-muted">
                        <Sparkles className="text-accent" size={28} aria-hidden />
                        <p className="text-sm">Chọn gợi ý hoặc gõ câu hỏi bên dưới.</p>
                      </div>
                    )}
                    {messages.map((m) =>
                      m.role === 'user' ? (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl bg-accent px-4 py-2.5 text-sm text-app whitespace-pre-wrap">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex justify-start gap-2">
                          <span className="mt-1 grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
                            <Bot size={16} aria-hidden />
                          </span>
                          <div className="max-w-[85%] rounded-2xl border border-accent/20 bg-accent-soft/30 px-4 py-2.5 text-sm whitespace-pre-wrap">
                            {m.content}
                          </div>
                        </div>
                      ),
                    )}
                    {busy && (
                      <p className="flex items-center gap-2 text-sm text-ink-muted">
                        <Loader2 className="animate-spin text-accent" size={16} aria-hidden />
                        Đang phân tích…
                      </p>
                    )}
                    {error && (
                      <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                        {error}
                      </p>
                    )}
                  </div>
                  <form
                    onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      void ask(question);
                    }}
                    className="border-t border-panel/40 p-3"
                  >
                    <label className="sr-only" htmlFor={inputId}>
                      Câu hỏi
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        id={inputId}
                        className="min-h-11 flex-1 rounded-xl border border-panel/50 bg-app/80 px-3 text-sm"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={busy}
                        maxLength={1000}
                        placeholder="Nhập câu hỏi…"
                      />
                      <button
                        type="submit"
                        disabled={busy || question.trim().length < 2}
                        aria-label="Gửi"
                        className="grid size-11 place-items-center rounded-xl bg-accent text-app disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
