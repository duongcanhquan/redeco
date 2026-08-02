'use client';

/**
 * Mục lục nhảy mục — chữ sáng rõ trên nền kính.
 */
export function GuideToc({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="Mục lục hướng dẫn"
      className="glass rounded-2xl p-2 sticky top-2 z-20 border-white/15"
    >
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs sm:text-sm font-semibold text-ink hover:text-accent hover:bg-accent-soft/50 whitespace-nowrap transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
