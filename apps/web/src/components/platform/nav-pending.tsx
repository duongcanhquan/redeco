'use client';

import { useLinkStatus } from 'next/link';

/** Chỉ báo đang chuyển trang — hiện sau 80ms tránh nháy khi đã prefetch. */
export function NavPendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-auto size-1.5 shrink-0 rounded-full bg-accent transition-opacity duration-150 ${
        pending ? 'opacity-100 animate-pulse' : 'opacity-0'
      }`}
      style={{ transitionDelay: pending ? '80ms' : '0ms' }}
    />
  );
}
