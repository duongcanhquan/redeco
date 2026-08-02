'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

/**
 * Tìm kiếm chứng từ qua query `?q=` — giữ các filter khác (status…).
 */
export function DocSearchBar({
  baseHref,
  initialQ = '',
  preserve = {},
  placeholder = 'Tìm mã, tên…',
}: {
  baseHref: string;
  initialQ?: string;
  preserve?: Record<string, string | null | undefined>;
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v) params.set(k, v);
    }
    const trimmed = q.trim();
    if (trimmed) params.set('q', trimmed);
    const qs = params.toString();
    router.push(qs ? `${baseHref}?${qs}` : baseHref);
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-1 min-w-[12rem] max-w-md items-center gap-2"
      role="search"
    >
      <label htmlFor="doc-search" className="sr-only">
        Tìm kiếm
      </label>
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          aria-hidden
        />
        <input
          id="doc-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-panel/50 bg-app/50 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        />
      </div>
      <button
        type="submit"
        className="h-11 shrink-0 rounded-xl border border-panel/50 px-4 text-sm font-medium text-ink-muted hover:text-ink hover:bg-glass-strong transition-colors cursor-pointer"
      >
        Tìm
      </button>
    </form>
  );
}
