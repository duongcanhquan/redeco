import { Bot } from 'lucide-react';
import Link from 'next/link';

/**
 * Easter egg: rê chuột vào góc trái dưới màn hình sẽ thấy một chú robot
 * nhỏ ló lên vẫy chào — bấm vào để vào trang đăng nhập quản trị.
 * Vẫn truy cập được bằng bàn phím (Tab tới sẽ hiện nhờ :focus-within).
 */
export function RobotEasterEgg() {
  return (
    <div
      className="robot-hotspot fixed bottom-0 left-0 z-50 flex h-24 w-28 items-end justify-start p-4"
      aria-hidden={false}
    >
      <Link
        href="/login"
        aria-label="Đăng nhập khu quản trị hệ thống"
        title="Khu quản trị"
        className="robot-peek group relative grid size-11 place-items-center rounded-full border border-accent/40 bg-app-deep/90 text-accent shadow-[0_0_18px_rgba(0,238,255,0.35)] backdrop-blur-sm transition-colors hover:bg-accent hover:text-app focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-3"
      >
        <Bot size={20} aria-hidden />
        <span className="pointer-events-none absolute bottom-full left-0 mb-2 whitespace-nowrap rounded-lg border border-panel/60 bg-app-deep/95 px-2.5 py-1 text-xs text-ink-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Bíp bíp… khu quản trị
        </span>
      </Link>
    </div>
  );
}
