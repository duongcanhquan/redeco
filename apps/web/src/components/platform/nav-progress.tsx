'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

/**
 * Thanh tiến trình mỏng sát mép trên — hiện NGAY khi URL đổi / khi bắt đầu tải,
 * tạo cảm giác hệ thống đã nhận thao tác (không đợi skeleton).
 */
function NavProgressInner() {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = `${pathname}?${search?.toString() ?? ''}`;
  const prev = useRef(key);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (prev.current === key) return;
    prev.current = key;
    setActive(true);
    const done = window.setTimeout(() => setActive(false), 400);
    return () => window.clearTimeout(done);
  }, [key]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1000] h-0.5 overflow-hidden"
      aria-hidden
    >
      <div
        className={`h-full bg-accent origin-left transition-transform ease-out ${
          active ? 'duration-300 scale-x-100' : 'duration-150 scale-x-0'
        }`}
      />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <NavProgressInner />
    </Suspense>
  );
}
