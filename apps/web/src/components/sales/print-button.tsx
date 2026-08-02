'use client';

import { Printer } from 'lucide-react';
import Link from 'next/link';

export function PrintButton({ href, label = 'In chứng từ' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="no-print inline-flex items-center gap-2 h-11 min-h-11 px-4 rounded-xl border border-panel/50 text-sm font-medium hover:border-accent/40 hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <Printer size={16} aria-hidden />
      {label}
    </Link>
  );
}
