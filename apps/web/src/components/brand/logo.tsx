import { useId } from 'react';

/**
 * Logo mark Optimake: lục giác (khối sản xuất) bị mũi tên tối ưu xuyên chéo lên.
 * Vết cắt dùng SVG mask nên trong suốt trên mọi nền.
 */
export function LogoMark({ size = 40 }: { size?: number }) {
  const id = useId();
  const gradId = `${id}-grad`;
  const cutId = `${id}-cut`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Logo Optimake"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00eeff" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <mask id={cutId}>
          <rect width="48" height="48" fill="white" />
          <line x1="13" y1="37" x2="35" y2="11" stroke="black" strokeWidth="9" strokeLinecap="round" />
        </mask>
      </defs>

      {/* Lục giác pointy-top */}
      <path
        d="M24 5.5 L39.8 14.75 L39.8 33.25 L24 42.5 L8.2 33.25 L8.2 14.75 Z"
        stroke={`url(#${gradId})`}
        strokeWidth="5"
        strokeLinejoin="round"
        mask={`url(#${cutId})`}
      />

      {/* Mũi tên tối ưu */}
      <line
        x1="14.5"
        y1="35.5"
        x2="30.5"
        y2="16.5"
        stroke={`url(#${gradId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path d="M37 8.5 L26.8 11.2 L33.6 19.4 Z" fill={`url(#${gradId})`} />
    </svg>
  );
}

/** Logo đầy đủ: mark + wordmark. */
export function Logo({ markSize = 40, textClassName = 'text-xl' }: { markSize?: number; textClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={markSize} />
      <span className={`font-bold tracking-wide leading-none ${textClassName}`}>
        <span className="text-accent">O</span>ptimake
      </span>
    </span>
  );
}
