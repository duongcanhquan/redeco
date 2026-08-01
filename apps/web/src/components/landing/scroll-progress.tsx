'use client';

import { useEffect, useRef } from 'react';

/** Thanh tiến trình cuộn trang — gradient cyan chạy sát mép trên. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = (): void => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      el.style.transform = `scaleX(${p})`;
    };
    const onScroll = (): void => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent">
      <div
        ref={ref}
        className="h-full origin-left bg-gradient-to-r from-accent via-blue-500 to-violet-500 shadow-[0_0_8px_rgba(0,238,255,0.7)]"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
