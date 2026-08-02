'use client';

import { Bot, Loader2, Send, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { askSalesAiAction } from '@/app/app/sales/ask-ai-action';

const SUGGESTIONS = [
  'Tóm tắt tình hình kinh doanh hôm nay',
  'Công nợ và hóa đơn quá hạn cảnh báo thế nào?',
  'Có bao nhiêu báo giá đang chờ duyệt?',
  'Đơn hàng đang chạy tập trung ở trạng thái nào?',
] as const;

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
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = entitled && configured && copilotEnabled;

  const ask = async (q: string): Promise<void> => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    setQuestion(text);
    const result = await askSalesAiAction(text, basePath);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAnswer(result.data.answer);
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
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            aria-label="Đóng"
            className="absolute inset-0 bg-app/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[101] flex max-h-[min(92dvh,40rem)] w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl border border-white/15 bg-app-deep shadow-2xl"
          >
            <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3 shrink-0">
              <Bot className="text-accent shrink-0" size={20} aria-hidden />
              <h2 id={titleId} className="flex-1 text-base font-bold text-ink">
                Trợ lý Kinh doanh
              </h2>
              <button
                type="button"
                aria-label="Đóng hội thoại"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-xl text-ink-muted hover:text-ink hover:bg-white/5"
              >
                <X size={20} aria-hidden />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!ready ? (
                <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink space-y-2">
                  <p className="font-semibold text-warning">Chưa sẵn sàng hỏi AI</p>
                  <p className="text-ink-muted leading-snug">
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
              ) : (
                <>
                  <p className="text-sm text-ink-muted leading-snug">
                    Hỏi về KPI, hàng đợi, công nợ, pipeline — trả lời từ dữ liệu tổng quan hiện tại
                    của công ty.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => void ask(s)}
                        className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs font-medium text-ink hover:border-accent/40 hover:text-accent disabled:opacity-50 min-h-11"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {busy && (
                    <p className="flex items-center gap-2 text-sm text-ink-muted">
                      <Loader2 className="animate-spin text-accent" size={16} aria-hidden />
                      Đang phân tích…
                    </p>
                  )}
                  {error && (
                    <p role="alert" className="text-sm text-danger rounded-xl border border-danger/30 bg-danger/10 px-3 py-2">
                      {error}
                    </p>
                  )}
                  {answer && (
                    <div className="rounded-xl border border-accent/25 bg-accent-soft/30 px-4 py-3 text-sm text-ink whitespace-pre-wrap leading-relaxed">
                      {answer}
                    </div>
                  )}
                </>
              )}
            </div>

            {ready && (
              <form
                onSubmit={onSubmit}
                className="shrink-0 border-t border-white/10 p-3 flex gap-2"
              >
                <label className="sr-only" htmlFor="sales-ai-q">
                  Câu hỏi
                </label>
                <input
                  id="sales-ai-q"
                  className="min-h-11 flex-1 rounded-xl border border-white/15 bg-app/80 px-3 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-app disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="animate-spin" size={18} aria-hidden />
                  ) : (
                    <Send size={18} aria-hidden />
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
