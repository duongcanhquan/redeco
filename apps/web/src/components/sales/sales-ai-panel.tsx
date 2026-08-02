'use client';

import { Bot, Loader2, MessageSquareText, Send, Sparkles, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { askSalesAiAction } from '@/app/app/sales/ask-ai-action';

const SUGGESTIONS = [
  'Tóm tắt tình hình kinh doanh hôm nay',
  'Công nợ và hóa đơn quá hạn cảnh báo thế nào?',
  'Có bao nhiêu báo giá đang chờ duyệt?',
  'Đơn hàng đang chạy tập trung ở trạng thái nào?',
] as const;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function SalesAiPanel({
  basePath,
  entitled,
  configured,
  copilotEnabled,
}: {
  basePath: string;
  /** Superadmin đã cấp AI + feature hỏi đáp */
  entitled: boolean;
  configured: boolean;
  copilotEnabled: boolean;
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

  const ready = entitled && configured && copilotEnabled;

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
    const userId = `u-${Date.now()}`;
    setBusy(true);
    setError(null);
    setQuestion(text);
    setMessages((prev) => [...prev, { id: userId, role: 'user', content: text }]);

    const result = await askSalesAiAction(text, basePath);
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

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    void ask(question);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app hover:opacity-95 transition-opacity active:scale-[0.98]"
      >
        <Sparkles size={18} aria-hidden />
        Hỏi AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center p-0 sm:p-4 md:p-6">
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
            className="relative z-[101] flex h-[100dvh] w-full flex-col overflow-hidden border border-panel/50 bg-app-deep shadow-2xl sm:h-[min(88dvh,44rem)] sm:max-w-3xl sm:rounded-2xl md:h-[min(90dvh,48rem)] md:max-w-5xl lg:max-w-6xl"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-panel/40 px-4 py-3 sm:px-5 sm:py-3.5">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent sm:size-11">
                <Bot size={22} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-lg font-bold text-ink sm:text-xl">
                  Trợ lý Kinh doanh
                </h2>
                <p className="truncate text-sm text-ink-muted">
                  KPI · hàng đợi · công nợ · pipeline
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng hội thoại"
                onClick={() => setOpen(false)}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-muted hover:bg-glass-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <X size={22} aria-hidden />
              </button>
            </header>

            {!ready ? (
              <div className="flex flex-1 items-center justify-center p-5 sm:p-8">
                <div className="w-full max-w-lg space-y-3 rounded-2xl border border-warning/40 bg-warning/10 px-5 py-5 text-base text-ink">
                  <p className="text-lg font-semibold text-warning">Chưa sẵn sàng hỏi AI</p>
                  <p className="leading-relaxed text-ink-muted">
                    {!entitled
                      ? 'Công ty chưa được cấp module Trợ lý AI trên hợp đồng (superadmin Optimake).'
                      : !configured
                        ? 'Đã có quyền AI — quản trị chưa lưu API key.'
                        : '«Hỏi đáp tổng quan» đang tắt trong Cài đặt AI.'}
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
              <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
                {/* Cột trái — câu hỏi nhanh (desktop/iPad); phone xếp trên */}
                <aside className="flex shrink-0 flex-col border-b border-panel/40 md:border-b-0 md:border-r md:min-h-0">
                  <div className="flex items-center gap-2 border-b border-panel/30 px-4 py-3 sm:px-5">
                    <Zap size={18} className="text-accent shrink-0" aria-hidden />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-ink-muted">
                      Câu hỏi nhanh
                    </h3>
                  </div>
                  <ul className="flex gap-2 overflow-x-auto p-3 sm:p-4 md:flex-1 md:flex-col md:overflow-y-auto md:overscroll-contain">
                    {SUGGESTIONS.map((s) => (
                      <li key={s} className="min-w-[14rem] shrink-0 md:min-w-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void ask(s)}
                          className="flex w-full min-h-12 items-start gap-2 rounded-xl border border-panel/40 bg-glass px-3.5 py-3 text-left text-sm font-medium leading-snug text-ink transition-colors hover:border-accent/45 hover:bg-accent-soft/40 hover:text-accent disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:text-base md:min-h-[3.25rem]"
                        >
                          <MessageSquareText
                            size={18}
                            className="mt-0.5 shrink-0 text-accent/80"
                            aria-hidden
                          />
                          <span>{s}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="hidden px-4 pb-4 text-xs leading-relaxed text-ink-muted md:block sm:px-5">
                    Chọn gợi ý hoặc gõ câu hỏi bên phải. Trả lời dựa trên dữ liệu tổng quan hiện tại
                    của công ty.
                  </p>
                </aside>

                {/* Cột phải — hội thoại */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <div
                    ref={listRef}
                    className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
                    aria-live="polite"
                  >
                    {messages.length === 0 && !busy && !error && (
                      <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-3 px-2 text-center">
                        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
                          <Sparkles size={28} aria-hidden />
                        </span>
                        <p className="max-w-md text-base font-semibold text-ink sm:text-lg">
                          Bắt đầu hỏi đáp Kinh doanh
                        </p>
                        <p className="max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
                          Chọn câu hỏi nhanh bên trái (hoặc phía trên trên điện thoại), hoặc gõ câu
                          hỏi phía dưới.
                        </p>
                      </div>
                    )}

                    {messages.map((m) =>
                      m.role === 'user' ? (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[min(100%,36rem)] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-base leading-relaxed text-app sm:px-5 sm:py-3.5 sm:text-[1.05rem]">
                            {m.content}
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex justify-start gap-2.5 sm:gap-3">
                          <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent sm:size-10">
                            <Bot size={18} aria-hidden />
                          </span>
                          <div className="max-w-[min(100%,40rem)] rounded-2xl rounded-bl-md border border-accent/25 bg-accent-soft/35 px-4 py-3 text-base leading-relaxed text-ink whitespace-pre-wrap sm:px-5 sm:py-4 sm:text-[1.05rem] sm:leading-relaxed">
                            {m.content}
                          </div>
                        </div>
                      ),
                    )}

                    {busy && (
                      <div className="flex items-center gap-2.5 text-base text-ink-muted">
                        <Loader2 className="animate-spin text-accent" size={20} aria-hidden />
                        Đang phân tích dữ liệu…
                      </div>
                    )}

                    {error && (
                      <p
                        role="alert"
                        className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-base text-danger"
                      >
                        {error}
                      </p>
                    )}
                  </div>

                  <form
                    onSubmit={onSubmit}
                    className="shrink-0 border-t border-panel/40 bg-app-deep/90 p-3 sm:p-4 md:p-5"
                  >
                    <label className="sr-only" htmlFor={inputId}>
                      Câu hỏi
                    </label>
                    <div className="flex items-end gap-2 sm:gap-3">
                      <input
                        ref={inputRef}
                        id={inputId}
                        className="min-h-12 flex-1 rounded-xl border border-panel/50 bg-app/80 px-4 py-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:min-h-[3.25rem] sm:text-[1.05rem]"
                        placeholder="VD: Công nợ tuần này thế nào?"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={busy}
                        maxLength={1000}
                      />
                      <button
                        type="submit"
                        disabled={busy || question.trim().length < 2}
                        aria-label="Gửi câu hỏi"
                        className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-app transition-opacity hover:opacity-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:size-[3.25rem]"
                      >
                        {busy ? (
                          <Loader2 className="animate-spin" size={20} aria-hidden />
                        ) : (
                          <Send size={20} aria-hidden />
                        )}
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
