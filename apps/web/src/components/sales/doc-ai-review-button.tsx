'use client';

import { Bot, Loader2, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';
import {
  reviewOrderAiAction,
  reviewQuotationAiAction,
} from '@/app/app/sales/ask-ai-action';

type ReviewKind = 'quotation' | 'order';

export function DocAiReviewButton({
  kind,
  docId,
  basePath,
  entitled,
  configured,
  enabled,
}: {
  kind: ReviewKind;
  docId: string;
  basePath: string;
  entitled: boolean;
  configured: boolean;
  enabled: boolean;
}) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = kind === 'quotation' ? 'Đánh giá báo giá' : 'Đánh giá đơn hàng';

  const run = async (): Promise<void> => {
    setOpen(true);
    if (!entitled || !configured || !enabled) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    const result =
      kind === 'quotation'
        ? await reviewQuotationAiAction(docId)
        : await reviewOrderAiAction(docId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAnswer(result.data.answer);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void run()}
        className="inline-flex h-11 min-h-11 items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft/40 px-3 text-sm font-semibold text-accent hover:bg-accent-soft transition-colors active:scale-[0.98]"
      >
        <Sparkles size={16} aria-hidden />
        AI đánh giá
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
            className="relative z-[101] flex max-h-[min(92dvh,36rem)] w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl border border-white/15 bg-app-deep shadow-2xl"
          >
            <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3 shrink-0">
              <Bot className="text-accent shrink-0" size={20} aria-hidden />
              <h2 id={titleId} className="flex-1 text-base font-bold text-ink">
                {label}
              </h2>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setOpen(false)}
                className="grid size-11 place-items-center rounded-xl text-ink-muted hover:text-ink hover:bg-white/5"
              >
                <X size={20} aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {(!entitled || !configured || !enabled) && (
                <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm space-y-2">
                  <p className="font-semibold text-warning">Chưa dùng được AI đánh giá</p>
                  <p className="text-ink-muted leading-snug">
                    {!entitled
                      ? 'Chưa được cấp module / tính năng AI tương ứng trên hợp đồng hoặc phân công.'
                      : !configured
                        ? 'Cần lưu API key AI trước.'
                        : `Bật «${label}» trong Cài đặt → AI → Áp dụng Kinh doanh.`}
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
              )}
              {busy && (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Loader2 className="animate-spin text-accent" size={16} aria-hidden />
                  Đang phân tích chứng từ…
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="text-sm text-danger rounded-xl border border-danger/30 bg-danger/10 px-3 py-2"
                >
                  {error}
                </p>
              )}
              {answer && (
                <div className="rounded-xl border border-accent/25 bg-accent-soft/30 px-4 py-3 text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {answer}
                </div>
              )}
            </div>
            {entitled && configured && enabled && !busy && (
              <div className="shrink-0 border-t border-white/10 p-3">
                <button
                  type="button"
                  onClick={() => void run()}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/20 text-sm font-semibold text-ink hover:border-accent/40"
                >
                  Phân tích lại
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
