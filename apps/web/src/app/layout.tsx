import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

// Poppins không có glyph tiếng Việt — Be Vietnam Pro là font hình học tương đương
const poppins = Be_Vietnam_Pro({
  variable: '--font-poppins',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'REDECO — Nền tảng ERP/MES',
  description: 'Hệ thống quản trị doanh nghiệp đa công ty',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
