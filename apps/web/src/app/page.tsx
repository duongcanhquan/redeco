import {
  AlarmClock,
  ArrowRight,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Brain,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Gauge,
  Layers,
  LineChart,
  MessagesSquare,
  PackageSearch,
  Puzzle,
  Rocket,
  ScrollText,
  ShieldCheck,
  Sparkles,
  ToggleRight,
  TrendingUp,
  Truck,
  Unplug,
  UsersRound,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo, LogoMark } from '@/components/brand/logo';
import { CountUp } from '@/components/landing/count-up';
import { Reveal } from '@/components/landing/reveal';
import { RobotEasterEgg } from '@/components/landing/robot-easter-egg';
import { LandingMobileNav } from '@/components/landing/mobile-nav';
import { ScrollProgress } from '@/components/landing/scroll-progress';

export const metadata: Metadata = {
  title: 'Optimake — Nền tảng ERP/MES tích hợp AI cho doanh nghiệp sản xuất',
  description:
    'Optimake đồng bộ mọi bước vận hành theo thời gian thực: kinh doanh, sản xuất, kho, nhân sự, tài chính — tự cá nhân hóa theo mô hình doanh nghiệp của bạn nhờ AI.',
};

const NAV_LINKS = [
  { href: '#noi-dau', label: 'Vấn đề' },
  { href: '#modules', label: 'Nền tảng' },
  { href: '#ca-nhan-hoa', label: 'Cá nhân hóa' },
  { href: '#ai', label: 'AI' },
  { href: '#quy-trinh', label: 'Quy trình' },
] as const;

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-x-clip bg-app text-ink">
      <ScrollProgress />
      {/* ===== Navbar ===== */}
      <header className="fixed inset-x-0 top-0 z-40">
        <div className="glass relative mx-3 mt-3 flex h-14 max-w-6xl items-center justify-between rounded-2xl px-2 sm:mx-auto sm:px-6">
          <Link href="/" aria-label="Optimake — về đầu trang" className="shrink-0 px-2">
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
          <div className="flex items-center gap-1">
            <LandingMobileNav />
            <Link
              href="/login"
              className="hidden h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-app transition-shadow hover:shadow-[0_0_18px_rgba(0,238,255,0.45)] sm:inline-flex"
            >
              Đăng nhập
              <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="bg-grid relative overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
        <div className="aurora left-[-10%] top-[-10%] h-105 w-105 bg-accent/60" />
        <div className="aurora right-[-12%] top-[20%] h-120 w-120 bg-blue-600/50 [animation-delay:4s]" />
        <div className="aurora bottom-[-30%] left-[30%] h-100 w-100 bg-violet-600/40 [animation-delay:8s]" />
        <Particles />

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
                <span className="text-shimmer bg-gradient-to-r from-accent via-blue-400 to-accent bg-clip-text text-transparent">
                  từ A đến Z
                </span>{' '}
                trên một nền tảng duy nhất
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                Mọi bước — từ chốt đơn, sản xuất đến thu tiền — đồng bộ theo thời gian thực. AI dự
                báo, trợ lý ảo và quy trình tự cá nhân hóa theo đúng cách doanh nghiệp bạn vận hành.
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
                  Khám phá nền tảng
                </a>
              </div>
            </Reveal>
            <Reveal delay={360}>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
                {['Đồng bộ realtime mọi phòng ban', 'Dữ liệu cách ly tuyệt đối (RLS)', 'Tự cá nhân hóa bằng AI'].map(
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

          <Reveal delay={200} className="relative">
            <HeroMock />
          </Reveal>
        </div>
      </section>

      {/* ===== Marquee ===== */}
      <div aria-hidden className="relative overflow-hidden border-y border-panel/30 bg-app-deep/70 py-3.5">
        <div className="marquee-track items-center">
          {Array.from({ length: 2 }, (_, dup) =>
            [
              'ERP + MES hợp nhất',
              'Đồng bộ realtime mọi bước',
              'AI Copilot 24/7',
              'ATP/CTP tức thì',
              'Truy xuất lô / serial',
              'Giá thành theo từng đơn',
              'Quy trình tự cá nhân hóa',
              'Cách ly dữ liệu RLS',
            ].map((t) => (
              <span
                key={`${dup}-${t}`}
                className="inline-flex items-center gap-3 whitespace-nowrap pr-3 text-sm font-medium text-ink-muted"
              >
                <Sparkles size={13} className="shrink-0 text-accent" aria-hidden />
                {t}
              </span>
            )),
          )}
        </div>
      </div>

      {/* ===== Stats strip — con số nhảy ===== */}
      <section aria-label="Con số nổi bật" className="relative border-b border-panel/30 bg-app-deep/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 py-8 sm:px-6 lg:grid-cols-4">
          {[
            { icon: Layers, to: 9, suffix: '+', label: 'Nền tảng nghiệp vụ liên thông' },
            { icon: ShieldCheck, to: 100, suffix: '%', label: 'Cách ly dữ liệu từng công ty' },
            { icon: Zap, to: 6, suffix: ' bước O2C', label: 'Đồng bộ realtime không đứt gãy' },
            { icon: Brain, to: 24, suffix: '/7', label: 'AI Copilot đồng hành' },
          ].map(({ icon: Icon, to, suffix, label }, i) => (
            <Reveal key={label} delay={i * 80} className="flex items-center gap-4 px-4 py-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
                <Icon size={20} aria-hidden />
              </span>
              <span>
                <CountUp to={to} suffix={suffix} className="block text-2xl font-bold" />
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
            Quy trình chạy trong bóng tối, các phòng ban lệch nhịp nhau — mỗi ngày chậm kiểm soát là
            một ngày mất tiền.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: EyeOff,
              title: 'Quy trình chạy "trong bóng tối"',
              desc: 'Đơn hàng đang nằm ở bước nào? Ai đang giữ? Tắc ở đâu? Không ai trả lời được ngay — kiểm soát luôn chậm một nhịp so với thực tế.',
              hot: true,
            },
            {
              icon: Unplug,
              title: 'Các bước lệch nhịp, không realtime',
              desc: 'Kinh doanh chốt đơn nhưng kho chưa biết, sản xuất chưa nhận lệnh, giao hàng chờ giấy tờ — mỗi khâu một nhịp, sai lệch dồn về cuối chuỗi.',
              hot: true,
            },
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
          ].map(({ icon: Icon, title, desc, hot }, i) => (
            <Reveal key={title} delay={i * 80}>
              <article
                className={`group glass glass-hover shimmer-card h-full rounded-2xl p-6 transition-transform hover:-translate-y-1 ${
                  hot ? 'border-danger/30' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="icon-bounce grid size-12 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
                    <Icon size={22} aria-hidden />
                  </span>
                  {hot && (
                    <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-bold tracking-wide text-danger">
                      ĐAU NHẤT
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
              </article>
            </Reveal>
          ))}
        </div>

        {/* Dải đồng bộ realtime — lời giải trực quan */}
        <Reveal delay={200}>
          <div className="glass mt-10 rounded-2xl border-accent/25 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-semibold">
                <span className="relative flex size-2.5">
                  <span className="pulse-ring absolute inline-flex size-full rounded-full bg-success" />
                  <span className="blink-dot relative inline-flex size-2.5 rounded-full bg-success" />
                </span>
                Với Optimake: mọi bước tự khai báo trạng thái — bạn nhìn thấy cả chuỗi{' '}
                <span className="text-accent">ngay lúc nó diễn ra</span>
              </p>
              <span className="rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold tracking-wider text-success">
                LIVE
              </span>
            </div>
            <div aria-hidden className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {['Chốt đơn', 'Lệnh kho', 'Sản xuất', 'QC', 'Giao hàng', 'Thu tiền'].map((s, i) => (
                <span
                  key={s}
                  className="step-live rounded-xl border border-panel/40 px-3 py-2.5 text-center text-xs font-medium text-ink-muted"
                  style={{ animationDelay: `${i * 1.2}s` }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <Beam />

      {/* ===== Các nền tảng ===== */}
      <section id="modules" className="relative scroll-mt-24 border-y border-panel/30 bg-app-deep/40 py-20">
        <div className="aurora left-[10%] top-[5%] h-80 w-80 bg-accent/40" />
        <div className="aurora right-[5%] bottom-[10%] h-72 w-72 bg-blue-600/40 [animation-delay:6s]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Hệ sinh thái nền tảng <span className="text-accent">liên thông realtime</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
              Mỗi nền tảng mạnh riêng, cùng nói chuyện trên một dòng dữ liệu — bật đúng thứ bạn cần,
              mở rộng dần theo quy mô.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal className="sm:col-span-2 lg:row-span-2">
              <article className="glass glass-hover shimmer-card flex h-full flex-col rounded-2xl border-accent/25 p-7 transition-transform hover:-translate-y-1">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                  <span className="blink-dot size-1.5 rounded-full bg-success" /> ĐANG VẬN HÀNH
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
              {
                icon: Wrench,
                title: 'Quản lý sản xuất (MES)',
                desc: 'Nhìn xuyên xưởng theo thời gian thực — từng lệnh sản xuất, từng công đoạn, từng máy.',
                points: ['Tiến độ công đoạn realtime', 'OEE & dữ liệu máy IoT', 'Cảnh báo tắc nghẽn tức thì'],
              },
              {
                icon: Boxes,
                title: 'Kho & chuỗi cung ứng',
                desc: 'Tồn kho chính xác đến giây, truy xuất nguồn gốc trọn vẹn từ vật tư đến thành phẩm.',
                points: ['Tồn realtime đa kho', 'Truy xuất lô / serial', 'Cảnh báo min–max tự động'],
              },
              {
                icon: CalendarClock,
                title: 'Kế hoạch MPS/MRP',
                desc: 'Biến dự báo và đơn hàng thật thành kế hoạch sản xuất và nhu cầu vật tư tối ưu.',
                points: ['Cân đối năng lực máy & người', 'Tính nhu cầu vật tư từ BOM', 'Lịch sản xuất kéo–thả'],
              },
              {
                icon: ClipboardCheck,
                title: 'Chất lượng + AI',
                desc: 'QC theo tiêu chuẩn từng công đoạn; AI phân tích dữ liệu lỗi để nâng chất lượng liên tục.',
                points: ['Phiếu kiểm theo tiêu chuẩn', 'AI truy nguyên nhân lỗi', 'Cảnh báo xu hướng bất thường'],
              },
              {
                icon: UsersRound,
                title: 'Nhân sự & ca kíp',
                desc: 'Quản trị con người gắn thẳng với sản lượng — ca kíp, năng suất, lương thưởng minh bạch.',
                points: ['Chấm công theo ca', 'Năng suất từng tổ đội', 'Lương theo sản phẩm'],
              },
              {
                icon: Building2,
                title: 'Hành chính số',
                desc: 'Phê duyệt, văn bản, tài sản, xe cộ, phòng họp — mọi thủ tục nội bộ chạy số hóa.',
                points: ['Luồng phê duyệt tùy biến', 'Quản lý văn bản & tài sản', 'Đặt lịch họp, xe, phòng'],
              },
              {
                icon: BadgeDollarSign,
                title: 'Tài chính & tối ưu chi phí',
                desc: 'Giá thành thực tế theo từng đơn hàng — bóc tách chi phí và chỉ ra đúng điểm rò rỉ.',
                points: ['Giá thành theo đơn thực tế', 'Công nợ & dòng tiền realtime', 'Phát hiện điểm rò rỉ chi phí'],
              },
              {
                icon: BarChart3,
                title: 'Phân tích AI đa chiều',
                desc: 'Dashboard lợi nhuận theo khu vực, sản phẩm, khách hàng — kèm khuyến nghị hành động.',
                points: ['Lợi nhuận đa chiều', 'Dự báo xu hướng ML', 'Khuyến nghị hành động tự động'],
              },
            ].map(({ icon: Icon, title, desc, points }, i) => (
              <Reveal key={title} delay={(i % 3) * 90}>
                <article className="group glass glass-hover shimmer-card h-full rounded-2xl p-6 transition-transform hover:-translate-y-1">
                  <span className="icon-bounce grid size-12 place-items-center rounded-xl border border-panel/60 bg-glass text-accent">
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-ink-muted">
                    {points.map((p) => (
                      <li key={p} className="inline-flex w-full items-center gap-1.5">
                        <CheckCircle2 size={13} className="shrink-0 text-accent/80" aria-hidden />
                        {p}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Beam />

      {/* ===== Cá nhân hóa ===== */}
      <section id="ca-nhan-hoa" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <PersonalizeOrbit />
          </Reveal>

          <div className="order-1 lg:order-2">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-xs font-medium text-accent">
                <Puzzle size={14} aria-hidden />
                Cá nhân hóa doanh nghiệp & quy trình
              </p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                Không ép doanh nghiệp theo phần mềm —{' '}
                <span className="text-shimmer bg-gradient-to-r from-accent via-blue-400 to-accent bg-clip-text text-transparent">
                  phần mềm tự uốn theo bạn
                </span>
              </h2>
              <p className="mt-4 text-ink-muted">
                Nhờ kiến trúc linh hoạt và AI, Optimake thích ứng với mọi mô hình — sản xuất theo
                đơn (MTO), theo kho (MTS), thiết kế theo yêu cầu (ETO) hay gia công OEM.
              </p>
            </Reveal>
            <div className="mt-8 space-y-5">
              {[
                {
                  icon: Layers,
                  title: 'Kiến trúc linh hoạt, không cần code',
                  desc: 'Thêm trường dữ liệu, biểu mẫu, báo cáo riêng của doanh nghiệp bạn — cấu hình là chạy, không chờ lập trình.',
                },
                {
                  icon: Workflow,
                  title: 'Quy trình tùy biến theo mô hình',
                  desc: 'Luồng duyệt, bước sản xuất, quy tắc giá — vẽ lại theo đúng cách xưởng của bạn đang vận hành.',
                },
                {
                  icon: Brain,
                  title: 'AI học cách bạn vận hành',
                  desc: 'Hệ thống quan sát dữ liệu thật, tự đề xuất tinh chỉnh quy trình và tự động hóa những việc lặp lại.',
                },
                {
                  icon: ToggleRight,
                  title: 'Bật module theo giai đoạn',
                  desc: 'Khởi đầu gọn với thứ cần nhất, mở thêm nền tảng khi doanh nghiệp lớn lên — không trả tiền cho thứ thừa.',
                },
              ].map(({ icon: Icon, title, desc }, i) => (
                <Reveal key={title} delay={i * 100}>
                  <div className="flex gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-accent/25 bg-accent-soft text-accent">
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
        </div>
      </section>

      <Beam />

      {/* ===== AI ===== */}
      <section id="ai" className="relative scroll-mt-24 border-y border-panel/30 bg-app-deep/40 py-20">
        <div className="aurora right-[10%] top-[10%] h-80 w-80 bg-violet-600/40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3.5 py-1.5 text-xs font-medium text-violet-300">
                <Brain size={14} aria-hidden />
                Trí tuệ nhân tạo cài sẵn trong mọi quy trình
              </p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
                AI không phải tính năng phụ —{' '}
                <span className="text-shimmer bg-gradient-to-r from-violet-400 via-accent to-violet-400 bg-clip-text text-transparent">
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

      <Beam />

      {/* ===== Quy trình A→Z ===== */}
      <section id="quy-trinh" className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
        <Reveal>
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">
              Trọn quy trình <span className="text-accent">Order to Cash</span> không đứt gãy
            </h2>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-center text-ink-muted">
            Mỗi bước bàn giao dữ liệu cho bước kế tiếp và phát tín hiệu trạng thái realtime — không
            nhập lại, không thất lạc, không chờ báo cáo.
          </p>
        </Reveal>

        <div className="relative mt-14">
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
                    <span
                      aria-hidden
                      className="pulse-ring absolute inset-0 rounded-2xl border border-accent/40"
                      style={{ animationDelay: `${i * 0.45}s` }}
                    />
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
      </section>

      {/* ===== CTA ===== */}
      <section className="relative overflow-hidden border-t border-panel/30 py-24">
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
   Hạt sáng bay lên trong hero — vị trí cố định (deterministic)
   để SSR/CSR khớp nhau, mỗi hạt một nhịp riêng.
   ------------------------------------------------------------ */
const PARTICLES = [
  { left: '4%', size: 3, dur: '11s', delay: '0s', drift: '26px' },
  { left: '12%', size: 2, dur: '14s', delay: '2.2s', drift: '-18px' },
  { left: '22%', size: 4, dur: '10s', delay: '4.5s', drift: '14px' },
  { left: '31%', size: 2, dur: '13s', delay: '1.1s', drift: '-24px' },
  { left: '42%', size: 3, dur: '12s', delay: '5.8s', drift: '20px' },
  { left: '53%', size: 2, dur: '15s', delay: '0.6s', drift: '-12px' },
  { left: '61%', size: 4, dur: '11s', delay: '3.4s', drift: '28px' },
  { left: '70%', size: 2, dur: '13s', delay: '6.7s', drift: '-20px' },
  { left: '79%', size: 3, dur: '10s', delay: '2.9s', drift: '16px' },
  { left: '87%', size: 2, dur: '14s', delay: '5.1s', drift: '-26px' },
  { left: '94%', size: 3, dur: '12s', delay: '1.8s', drift: '12px' },
] as const;

function Particles() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size,
              opacity: 0,
              boxShadow: '0 0 8px rgba(0,238,255,0.8)',
              '--dur': p.dur,
              '--delay': p.delay,
              '--drift': p.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------
   Tia sáng nối liền các section: đường dọc + giọt sáng chảy
   xuống liên tục — dẫn mắt người xem đi tiếp.
   ------------------------------------------------------------ */
function Beam() {
  return (
    <div aria-hidden className="relative mx-auto h-18 w-px bg-gradient-to-b from-transparent via-accent/35 to-transparent">
      <span className="absolute left-1/2 top-0 -translate-x-1/2">
        <span className="beam-drop block size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(0,238,255,0.9)]" />
      </span>
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
    <div className="relative mx-auto w-full max-w-lg">
      {/* Vòng conic quay chậm phía sau */}
      <div aria-hidden className="hero-ring absolute -inset-10 -z-10 rounded-full opacity-70 blur-2xl" />
      <div aria-hidden className="glass rounded-3xl border-accent/20 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-danger/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-3 h-2 w-28 rounded-full bg-glass-strong" />
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
            <span className="blink-dot size-1.5 rounded-full bg-success" /> LIVE
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Đơn hàng', to: 128, suffix: '', decimals: 0, trend: '+12%' },
            { label: 'Tồn kho', to: 4.2, suffix: 'k', decimals: 1, trend: 'ổn định' },
            { label: 'Công nợ', to: 1.8, suffix: ' tỷ', decimals: 1, trend: '-8%' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-glass px-3 py-2.5">
              <p className="text-[10px] text-ink-muted">{s.label}</p>
              <CountUp
                to={s.to}
                suffix={s.suffix}
                decimals={s.decimals}
                className="text-sm font-bold"
              />
              <p className="text-[10px] text-accent">{s.trend}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex h-32 items-end gap-2.5 rounded-xl bg-glass p-3">
          {bars.map((h, i) => (
            <span
              key={i}
              className="bar-breathe flex-1 rounded-t-md bg-gradient-to-t from-accent/30 to-accent"
              style={{ height: `${h}%`, animationDelay: `${300 + i * 110}ms, ${1500 + i * 220}ms` }}
            />
          ))}
        </div>
      </div>

      <div aria-hidden className="float-slow glass absolute -left-4 top-16 hidden rounded-2xl border-success/30 px-4 py-3 sm:block">
        <p className="flex items-center gap-2 text-xs font-semibold text-success">
          <CheckCircle2 size={15} aria-hidden />
          ATP: Đủ hàng, giao 12/08
        </p>
      </div>

      <div aria-hidden className="float-slower glass absolute -right-3 bottom-10 hidden rounded-2xl border-violet-400/30 px-4 py-3 sm:block">
        <p className="flex items-center gap-2 text-xs font-semibold text-violet-300">
          <TrendingUp size={15} aria-hidden />
          AI dự báo: +18% đơn quý tới
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Quỹ đạo cá nhân hóa: lõi AI ở giữa, 8 nền tảng xoay quanh
   (icon luôn thẳng đứng nhờ counter-rotate), chip mô hình DN
   sáng lên lần lượt bên dưới.
   ------------------------------------------------------------ */
const ORBIT_ITEMS = [
  ScrollText,
  Wrench,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  UsersRound,
  Building2,
  BadgeDollarSign,
] as const;

function PersonalizeOrbit() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-md">
      <div className="relative mx-auto aspect-square w-full max-w-90 [--orbit-r:8.2rem] sm:[--orbit-r:10.4rem]">
        {/* Vòng quỹ đạo */}
        <div className="absolute inset-[8%] rounded-full border border-panel/50" />
        <div className="absolute inset-[26%] rounded-full border border-panel/35" />
        <div className="glow-pulse absolute inset-[38%] rounded-full bg-accent/10 blur-2xl" />

        {/* Lõi AI */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="glass grid size-24 place-items-center rounded-3xl border-accent/30 shadow-[0_0_36px_rgba(0,238,255,0.25)]">
            <LogoMark size={52} />
          </div>
          <p className="mt-2 text-center text-[11px] font-semibold text-accent">Lõi AI</p>
        </div>

        {/* Các nền tảng xoay quanh */}
        <div className="orbit absolute inset-0">
          {ORBIT_ITEMS.map((Icon, i) => {
            const angle = (i / ORBIT_ITEMS.length) * 360;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `rotate(${angle}deg) translateX(var(--orbit-r))` }}
              >
                <div style={{ transform: `rotate(${-angle}deg)` }}>
                  <div className="orbit-reverse -ml-5 -mt-5 grid size-10 place-items-center rounded-xl border border-accent/25 bg-app-deep/90 text-accent shadow-[0_0_14px_rgba(0,238,255,0.18)]">
                    <Icon size={18} aria-hidden />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chip mô hình doanh nghiệp */}
      <div className="mt-6 grid grid-cols-5 gap-2">
        {['MTO', 'MTS', 'ETO', 'OEM', 'B2B'].map((m, i) => (
          <span
            key={m}
            className="step-live rounded-xl border border-panel/40 py-2 text-center text-xs font-bold text-ink-muted"
            style={{ animationDelay: `${i * 1.44}s` }}
          >
            {m}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">
        Một nền tảng — tự thích ứng với mọi mô hình sản xuất kinh doanh
      </p>
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
            <span className="blink-dot size-1.5 rounded-full bg-success" /> Trực tuyến
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
