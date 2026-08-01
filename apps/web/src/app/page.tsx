import {
  AlarmClock,
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Gauge,
  Layers,
  LineChart,
  MessagesSquare,
  PackageSearch,
  Rocket,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  UsersRound,
  Wallet,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Reveal } from '@/components/landing/reveal';
import { RobotEasterEgg } from '@/components/landing/robot-easter-egg';

export const metadata: Metadata = {
  title: 'Optimake — Nền tảng ERP/MES tích hợp AI cho doanh nghiệp sản xuất',
  description:
    'Optimake giải quyết nỗi đau của doanh nghiệp sản xuất từ A đến Z: kinh doanh, kho, sản xuất, kế hoạch, chất lượng — trên một nền tảng thông minh tích hợp AI.',
};

const NAV_LINKS = [
  { href: '#noi-dau', label: 'Vấn đề' },
  { href: '#modules', label: 'Module' },
  { href: '#ai', label: 'AI' },
  { href: '#quy-trinh', label: 'Quy trình' },
] as const;

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-app text-ink">
      {/* ===== Navbar ===== */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="glass mx-3 mt-3 flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 sm:mx-auto sm:px-6">
          <Link href="/" aria-label="Optimake — về đầu trang" className="shrink-0">
            <Logo markSize={32} textClassName="text-lg" />
          </Link>
          <nav aria-label="Điều hướng trang chủ" className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-3.5 py-2 text-sm text-ink-muted transition-colors hover:bg-glass-strong hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.45)]"
          >
            Đăng nhập
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="bg-grid relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
        {/* Aurora nền */}
        <div className="aurora left-[-10%] top-[-10%] h-105 w-105 bg-accent/60" />
        <div className="aurora right-[-12%] top-[20%] h-120 w-120 bg-blue-600/50 [animation-delay:4s]" />
        <div className="aurora bottom-[-30%] left-[30%] h-100 w-100 bg-violet-600/40 [animation-delay:8s]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-xs font-medium text-accent">
                <Sparkles size={14} aria-hidden />
                Nền tảng ERP/MES thế hệ mới, tích hợp AI
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-[3.4rem]">
                Vận hành nhà máy{' '}
                <span className="bg-gradient-to-r from-accent to-blue-500 bg-clip-text text-transparent">
                  từ A đến Z
                </span>{' '}
                trên một nền tảng duy nhất
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                Optimake gom kinh doanh, kho, sản xuất, kế hoạch và tài chính về một nơi — dữ liệu
                thời gian thực, AI dự báo và trợ lý ảo giúp bạn quyết định nhanh hơn đối thủ.
              </p>
            </Reveal>
            <Reveal delay={270}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="group relative inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-sm font-semibold text-app transition-shadow hover:shadow-[0_0_28px_rgba(0,238,255,0.5)]"
                >
                  <span className="glow-pulse absolute inset-0 -z-10 rounded-2xl bg-accent/40 blur-lg" />
                  Bắt đầu ngay
                  <Rocket size={16} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#modules"
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-panel/70 px-6 text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:bg-glass"
                >
                  Khám phá module
                </a>
              </div>
            </Reveal>
            <Reveal delay={360}>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
                {['Triển khai theo module', 'Dữ liệu cách ly tuyệt đối (RLS)', 'Dùng được trên mọi thiết bị'].map(
                  (t) => (
                    <li key={t} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-success" aria-hidden />
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </Reveal>
          </div>

          {/* Mock dashboard nổi */}
          <Reveal delay={200} className="relative">
            <HeroMock />
          </Reveal>
        </div>
      </section>

      {/* ===== Stats strip ===== */}
      <section aria-label="Con số nổi bật" className="relative border-y border-panel/30 bg-app-deep/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-8 sm:px-6 lg:grid-cols-4">
          {[
            { icon: Layers, value: '8+', label: 'Module lõi mở rộng dần' },
            { icon: ShieldCheck, value: '100%', label: 'Cách ly dữ liệu từng công ty' },
            { icon: Zap, value: '< 1 giây', label: 'Kiểm tra tồn kho & tín dụng' },
            { icon: Brain, value: '24/7', label: 'AI Copilot đồng hành' },
          ].map(({ icon: Icon, value, label }, i) => (
            <Reveal key={label} delay={i * 80} className="flex items-center gap-4 px-4 py-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
                <Icon size={20} aria-hidden />
              </span>
              <span>
                <span className="block text-2xl font-bold">{value}</span>
                <span className="block text-xs text-ink-muted">{label}</span>
              </span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Nỗi đau ===== */}
      <section id="noi-dau" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Nỗi đau quen thuộc của <span className="text-accent">doanh nghiệp sản xuất</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
            Dữ liệu rời rạc, quyết định chậm, khách hàng chờ đợi — Optimake sinh ra để xóa bỏ tất cả.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: FileSpreadsheet,
              title: 'Excel chồng Excel',
              desc: 'Báo giá, tồn kho, công nợ nằm rải rác chục file — sai một ô, lệch cả chuỗi.',
            },
            {
              icon: PackageSearch,
              title: 'Không dám hứa ngày giao',
              desc: 'Không biết tồn kho thật, không biết năng lực sản xuất — Sales trả lời khách bằng cảm tính.',
            },
            {
              icon: AlarmClock,
              title: 'Công nợ vượt kiểm soát',
              desc: 'Đơn cứ chốt, nợ cứ phình. Phát hiện vượt hạn mức khi đã quá muộn.',
            },
            {
              icon: Gauge,
              title: 'Báo cáo luôn trễ nhịp',
              desc: 'Số liệu tổng hợp tay mất nhiều ngày — ra quyết định dựa trên quá khứ.',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <Reveal key={title} delay={i * 90}>
              <article className="glass glass-hover h-full rounded-2xl p-6">
                <span className="grid size-12 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
                  <Icon size={22} aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== Bento modules ===== */}
      <section id="modules" className="relative scroll-mt-24 border-y border-panel/30 bg-app-deep/40 py-20">
        <div className="aurora left-[10%] top-[10%] h-80 w-80 bg-accent/40" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Một nền tảng — <span className="text-accent">đầy đủ mọi mắt xích</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
              Bật đúng module bạn cần, mở rộng dần theo quy mô. Tất cả nói chuyện với nhau theo thời
              gian thực.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal className="sm:col-span-2 lg:row-span-2">
              <article className="glass glass-hover flex h-full flex-col rounded-2xl border-accent/25 p-7">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                  <CheckCircle2 size={12} aria-hidden /> ĐANG VẬN HÀNH
                </span>
                <span className="mt-4 grid size-13 place-items-center rounded-2xl border border-accent/30 bg-accent-soft text-accent">
                  <ScrollText size={26} aria-hidden />
                </span>
                <h3 className="mt-4 text-xl font-bold">Kinh doanh — Order to Cash</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  CRM, báo giá nhiều cấp duyệt, đơn hàng tự kiểm tra hạn mức tín dụng, ATP quét tồn
                  kho tức thì, lệnh giao hàng trừ kho nguyên tử và hóa đơn theo dõi công nợ — trọn
                  vòng từ chào giá đến thu tiền.
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                  {[
                    'CRM & hạn mức tín dụng',
                    'Báo giá → Đơn hàng 1 chạm',
                    'ATP/CTP kiểm tra khả giao',
                    'Giao hàng & hóa đơn tự động',
                  ].map((t) => (
                    <li key={t} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="shrink-0 text-accent" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>

            {[
              { icon: Boxes, title: 'Kho & tồn kho', desc: 'Tồn thời gian thực, cảnh báo mức tối thiểu, truy xuất lô.' },
              { icon: Wrench, title: 'Sản xuất MES', desc: 'Lệnh sản xuất, tiến độ từng công đoạn, dữ liệu máy IoT.' },
              { icon: CalendarClock, title: 'Kế hoạch MPS/MRP', desc: 'Hoạch định nhu cầu vật tư từ dự báo và đơn hàng thật.' },
              { icon: ClipboardCheck, title: 'Chất lượng QC', desc: 'Tiêu chuẩn kiểm, phiếu QC, truy vết nguyên nhân lỗi.' },
              { icon: UsersRound, title: 'Nhân sự & ca kíp', desc: 'Chấm công theo ca, năng suất từng tổ đội.' },
              { icon: Wallet, title: 'Tài chính', desc: 'Công nợ, dòng tiền, giá thành theo đơn hàng thực tế.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal key={title} delay={(i % 3) * 90}>
                <article className="glass glass-hover h-full rounded-2xl p-6">
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center rounded-xl border border-panel/60 bg-glass text-accent">
                      <Icon size={22} aria-hidden />
                    </span>
                    <span className="rounded-full bg-glass px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                      Sắp ra mắt
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AI ===== */}
      <section id="ai" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-medium text-violet-300">
                <Brain size={14} aria-hidden />
                Trí tuệ nhân tạo cài sẵn trong mọi quy trình
              </p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                AI không phải tính năng phụ —{' '}
                <span className="bg-gradient-to-r from-violet-400 to-accent bg-clip-text text-transparent">
                  là bộ não vận hành
                </span>
              </h2>
            </Reveal>
            <div className="mt-8 space-y-5">
              {[
                {
                  icon: MessagesSquare,
                  title: 'ERP Copilot',
                  desc: 'Hỏi bằng tiếng Việt tự nhiên: "Đơn nào nguy cơ trễ tuần này?" — Copilot quét chéo kho, sản xuất, kinh doanh và trả lời ngay.',
                },
                {
                  icon: LineChart,
                  title: 'Dự báo nhu cầu bằng Machine Learning',
                  desc: 'Phân tích lịch sử bán, mùa vụ, xu hướng thị trường — đẩy thẳng vào kế hoạch sản xuất để mua vật tư trước khi khan hàng.',
                },
                {
                  icon: TrendingUp,
                  title: 'Cảnh báo rời bỏ & gợi ý hành động',
                  desc: 'Khách sỉ đổi chu kỳ đặt hàng? Hệ thống gắn cờ đỏ và gợi ý Sales bước tiếp theo đúng thời điểm.',
                },
              ].map(({ icon: Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 100}>
                  <div className="flex gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-300">
                      <Icon size={22} aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={150}>
            <CopilotMock />
          </Reveal>
        </div>
      </section>

      {/* ===== Quy trình A→Z ===== */}
      <section id="quy-trinh" className="relative scroll-mt-24 border-y border-panel/30 bg-app-deep/40 py-20">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Trọn quy trình <span className="text-accent">Order to Cash</span> không đứt gãy
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
              Mỗi bước bàn giao dữ liệu cho bước kế tiếp — không nhập lại, không thất lạc.
            </p>
          </Reveal>

          <div className="relative mt-14">
            {/* Dòng chảy nối các bước (desktop) */}
            <svg
              aria-hidden
              className="absolute left-0 right-0 top-7 hidden h-2 w-full lg:block"
              preserveAspectRatio="none"
              viewBox="0 0 1000 8"
            >
              <line x1="60" y1="4" x2="940" y2="4" stroke="rgba(0,238,255,0.35)" strokeWidth="2" className="dash-flow" />
            </svg>

            <ol className="grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { icon: FileText, label: 'Báo giá', desc: 'Nhiều cấp duyệt' },
                { icon: ScrollText, label: 'Đơn hàng', desc: 'Tự check tín dụng' },
                { icon: PackageSearch, label: 'ATP/CTP', desc: 'Hứa ngày giao chuẩn' },
                { icon: Workflow, label: 'Sản xuất', desc: 'Theo dõi tiến độ' },
                { icon: Truck, label: 'Giao hàng', desc: 'Trừ kho nguyên tử' },
                { icon: BadgeDollarSign, label: 'Thu tiền', desc: 'Công nợ realtime' },
              ].map(({ icon: Icon, label, desc }, i) => (
                <Reveal key={label} delay={i * 90}>
                  <li className="relative flex flex-col items-center text-center">
                    <span className="relative grid size-14 place-items-center rounded-2xl border border-accent/30 bg-app-deep text-accent shadow-[0_0_20px_rgba(0,238,255,0.15)]">
                      <Icon size={24} aria-hidden />
                      <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-app">
                        {i + 1}
                      </span>
                    </span>
                    <span className="mt-3 font-semibold">{label}</span>
                    <span className="mt-1 text-xs text-ink-muted">{desc}</span>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative overflow-hidden py-24">
        <div className="aurora left-[20%] top-[0%] h-90 w-90 bg-accent/50" />
        <div className="aurora right-[15%] bottom-[-20%] h-90 w-90 bg-blue-600/40 [animation-delay:5s]" />
        <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Sẵn sàng tăng tốc <span className="text-accent">nhà máy của bạn?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink-muted">
            Đăng nhập bằng tài khoản công ty của bạn, hoặc liên hệ để được tư vấn lộ trình chuyển đổi
            số phù hợp nhất.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="group relative inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-7 text-sm font-semibold text-app transition-shadow hover:shadow-[0_0_28px_rgba(0,238,255,0.5)]"
            >
              <span className="glow-pulse absolute inset-0 -z-10 rounded-2xl bg-accent/40 blur-lg" />
              Vào không gian làm việc
              <ArrowRight size={16} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-panel/30 bg-app-deep/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo markSize={28} textClassName="text-base" />
          <p className="text-xs text-ink-muted">
            © {new Date().getFullYear()} Optimake — Nền tảng ERP/MES cho doanh nghiệp sản xuất Việt.
          </p>
        </div>
      </footer>

      <RobotEasterEgg />
    </div>
  );
}

/* ------------------------------------------------------------
   Mock dashboard trong hero — thuần CSS, cột chart mọc lên,
   2 card nổi trôi lơ lửng hai bên.
   ------------------------------------------------------------ */
function HeroMock() {
  const bars = [42, 66, 50, 82, 58, 92, 74];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-lg">
      <div className="glass rounded-3xl border-accent/20 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {/* Thanh tiêu đề giả */}
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-3 h-2 w-28 rounded-full bg-glass-strong" />
        </div>

        {/* Stat chips */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Đơn hàng', value: '128', trend: '+12%' },
            { label: 'Tồn kho', value: '4.2k', trend: 'ổn định' },
            { label: 'Công nợ', value: '1.8 tỷ', trend: '-8%' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-glass px-3 py-2.5">
              <p className="text-[10px] text-ink-muted">{s.label}</p>
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-accent">{s.trend}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="mt-5 flex h-32 items-end gap-2.5 rounded-xl bg-glass p-3">
          {bars.map((h, i) => (
            <span
              key={i}
              className="bar-grow flex-1 rounded-t-md bg-gradient-to-t from-accent/30 to-accent"
              style={{ height: `${h}%`, animationDelay: `${300 + i * 110}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Card nổi: ATP */}
      <div className="float-slow glass absolute -left-4 top-16 hidden rounded-2xl border-success/30 px-4 py-3 sm:block">
        <p className="flex items-center gap-2 text-xs font-semibold text-success">
          <CheckCircle2 size={15} aria-hidden />
          ATP: Đủ hàng, giao 12/08
        </p>
      </div>

      {/* Card nổi: AI forecast */}
      <div className="float-slower glass absolute -right-3 bottom-10 hidden rounded-2xl border-violet-400/30 px-4 py-3 sm:block">
        <p className="flex items-center gap-2 text-xs font-semibold text-violet-300">
          <TrendingUp size={15} aria-hidden />
          AI dự báo: +18% đơn quý tới
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Mock hội thoại ERP Copilot — bong bóng chat + chấm đang gõ.
   ------------------------------------------------------------ */
function CopilotMock() {
  return (
    <div aria-hidden className="glass relative mx-auto w-full max-w-md rounded-3xl border-violet-400/20 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex items-center gap-3 border-b border-panel/40 pb-4">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-accent text-app">
          <Brain size={20} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">ERP Copilot</p>
          <p className="flex items-center gap-1.5 text-[11px] text-success">
            <span className="size-1.5 rounded-full bg-success" /> Trực tuyến
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3.5">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent/15 px-4 py-2.5 text-sm">
          Đơn hàng nào có nguy cơ giao trễ tuần này?
        </div>
        <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-glass-strong px-4 py-3 text-sm leading-relaxed">
          Có <strong className="text-warning">2 đơn</strong> nguy cơ trễ:
          <span className="mt-2 block rounded-lg bg-glass px-3 py-2 text-xs">
            <strong>SO-0142</strong> — thiếu 120kg nhôm 6061, vật tư về 09/08
          </span>
          <span className="mt-1.5 block rounded-lg bg-glass px-3 py-2 text-xs">
            <strong>SO-0155</strong> — máy CNC-02 bảo trì, đề xuất chuyển CNC-04
          </span>
        </div>
        <div className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm bg-glass-strong px-4 py-3">
          <span className="typing-dot size-1.5 rounded-full bg-ink-muted" />
          <span className="typing-dot size-1.5 rounded-full bg-ink-muted" />
          <span className="typing-dot size-1.5 rounded-full bg-ink-muted" />
        </div>
      </div>
    </div>
  );
}
