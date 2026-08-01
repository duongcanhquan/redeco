'use client';

import { useEffect, useRef } from 'react';

/**
 * Con số "nhảy" từ 0 lên giá trị đích khi cuộn tới (rAF + ease-out).
 * prefers-reduced-motion => hiện thẳng giá trị cuối.
 */
export function CountUp({
  to,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1400,
  className = '',
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = (value: number): void => {
      el.textContent = `${prefix}${value.toLocaleString('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      render(to);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number): void => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
          render(to * eased);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, prefix, suffix, decimals, duration]);

  // Render sẵn giá trị cuối cho SEO/no-JS; client sẽ đếm lại từ 0
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {to.toLocaleString('vi-VN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
