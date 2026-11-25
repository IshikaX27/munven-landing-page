import Image from "next/image";
import Link from "next/link";
import RedirectIfLoggedIn from "./components/RedirectIfLoggedIn";
import { HeroWorkspaceFrame, LandingNavbar, MunvenMark } from "./components/LandingInteractive";
import { Icon, IconName } from "./components/ui";

const HERO_PILLS: { icon: IconName; label: string }[] = [
  { icon: "sparkles", label: "Contextual answers" },
  { icon: "fileText", label: "Source-backed" },
  { icon: "users", label: "Team-ready" },
  { icon: "key", label: "Enterprise secure" },
];

const FEATURE_CARDS: {
  icon: IconName;
  title: string;
  text: string;
  highlighted?: boolean;
}[] = [
  {
    icon: "chat",
    title: "AI Assistant",
    text: "Get accurate, contextual answers with clickable citations.",
  },
  {
    icon: "fileText",
    title: "Multimodal RAG",
    text: "Search across PDFs, decks, sheets, images, video and audio.",
    highlighted: true,
  },
  {
    icon: "users",
    title: "Team Collaboration",
    text: "Live group chat, shared workspaces and project updates.",
  },
  {
    icon: "key",
    title: "Permissions & ACL",
    text: "Role-based groups, 7-day invites and admin data controls.",
    highlighted: true,
  },
  {
    icon: "timeline",
    title: "Feature Timelines",
    text: "Auto-extract decisions, changes, requirements and issues.",
  },
];

const STEPS: { number: string; title: string; text: string }[] = [
  {
    number: "01",
    title: "Upload files or whole folders",
    text: "Drop in PDFs, Office files, images, or 500 MB recordings. Parsing, OCR, and indexing run automatically.",
  },
  {
    number: "02",
    title: "Ask solo or with your team",
    text: "Query your private Personal space or ask Munven AI together inside a shared group chat room.",
  },
  {
    number: "03",
    title: "Verify sources & track decisions",
    text: "Open the exact page, slide, or video second behind every answer and follow one timeline per feature.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0c0b10] text-[#f9fafb] flex flex-col overflow-x-clip">
      <RedirectIfLoggedIn />
      <LandingNavbar />

      <main className="flex-1">
        {/* Hero Section — Obsidian canvas with warm coral ambient glow & floating workspace */}
        <section className="relative pt-10 pb-20 lg:pt-16 lg:pb-24">
          {/* Subtle top ambient radial sheen */}
          <div
            className="pointer-events-none absolute top-0 right-0 w-[60%] h-[34rem] bg-[radial-gradient(ellipse_at_top_right,rgba(245,133,89,0.16),transparent_65%)]"
            aria-hidden="true"
          />

          <div className="relative max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f58559]/10 border border-[#f58559]/30 px-3.5 py-1 text-xs font-medium text-[#f8a07a]">
                <Icon name="sparkles" className="w-3.5 h-3.5 text-[#f58559]" />
                AI Knowledge Workspace
              </span>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight leading-[1.08] text-[#f9fafb]">
                Your company&apos;s knowledge, connected and{" "}
                <span className="relative inline-block text-[#f58559]">
                  actionable.
                  <svg
                    viewBox="0 0 220 14"
                    fill="none"
                    className="absolute -bottom-2 left-0 w-full h-3 text-[#f58559]/80"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 10.5C58 2.5 148 1.5 217 8.5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-[#9e9ba8] leading-relaxed">
                An AI-native workspace that brings your documents, videos, chats and projects together, so you can find
                source-backed answers and make decisions faster.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/register"
                  className="h-11 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ff966b] to-[#f27849] text-[#140e0e] text-sm font-semibold hover:brightness-105 shadow-[0_10px_30px_-8px_rgba(245,133,89,0.6)] transition"
                >
                  Get started free
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/login"
                  className="h-11 px-6 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] text-sm font-medium text-[#f1eff7] hover:bg-white/[0.08] transition-colors"
                >
                  <Icon name="key" className="w-4 h-4 text-[#a6a3b2]" />
                  Sign in
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-[#a6a3b2]">
                {HERO_PILLS.map((pill) => (
                  <span key={pill.label} className="inline-flex items-center gap-1.5">
                    <Icon name={pill.icon} className="w-3.5 h-3.5 text-[#f58559]" />
                    {pill.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Floating Angled App Frame */}
            <div className="lg:col-span-6">
              <HeroWorkspaceFrame />
            </div>
          </div>
        </section>

        {/* Built for modern teams — 5-Card Bento Row matching reference */}
        <section id="features" className="relative py-16 lg:py-20 border-t border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f58559]/10 border border-[#f58559]/30 px-3.5 py-1 text-xs font-medium text-[#f8a07a]">
                <Icon name="sparkles" className="w-3.5 h-3.5 text-[#f58559]" />
                Built for modern teams
              </span>
              <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-[#f9fafb]">
                Everything you need to unlock your organization&apos;s knowledge.
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {FEATURE_CARDS.map((card) => (
                <div
                  key={card.title}
                  className={`relative rounded-2xl p-5 border transition-colors overflow-hidden ${
                    card.highlighted
                      ? "bg-gradient-to-b from-[#231718] via-[#17141c] to-[#13121a] border-[#f58559]/45 shadow-[0_0_35px_-16px_rgba(245,133,89,0.5)]"
                      : "bg-[#14131c]/90 border-white/[0.09] hover:border-white/20"
                  }`}
                >
                  {card.highlighted && (
                    <div
                      className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-36 h-20 rounded-full bg-[#f58559]/25 blur-2xl"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl border ${
                      card.highlighted
                        ? "bg-[#f58559]/15 border-[#f58559]/35 text-[#f58559]"
                        : "bg-white/[0.04] border-white/10 text-[#f58559]"
                    }`}
                  >
                    <Icon name={card.icon} className="w-4.5 h-4.5" />
                  </span>
                  <h3 className="relative mt-4 text-base font-semibold text-[#f9fafb]">{card.title}</h3>
                  <p className="relative mt-1.5 text-sm text-[#9b98a8] leading-relaxed">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Minimal Editorial Rows with Relatable Workspace Photos */}
        <section id="teams" className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-24 space-y-20 lg:space-y-28">
          {/* Row 1 */}
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-[#14131c]">
                <Image
                  src="/images/research-focus.jpg"
                  alt="Colleague reviewing company reports and taking notes beside a laptop"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover brightness-95"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#0c0b10]/70 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 rounded-xl bg-[#13121a]/90 backdrop-blur-md border border-white/10 px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs text-[#f1eff7] truncate">
                    <Icon name="fileText" className="w-3.5 h-3.5 text-[#f58559] flex-shrink-0" />
                    Checkout_PRD_v3.pdf · Page 4
                  </span>
                  <span className="text-[11px] font-medium text-[#f58559] flex-shrink-0">Jump to source →</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f58559]">
                Source-backed RAG
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#f9fafb] leading-snug">
                Ask in plain language. Verify the exact page or second.
              </h2>
              <p className="mt-4 text-base text-[#9e9ba8] leading-relaxed">
                Upload PDFs, Word docs, slides, spreadsheets, images, or 500 MB video and audio recordings. Every
                streaming answer includes clickable citations that open right to the page, sheet tab, or video
                timestamp.
              </p>
              <ul className="mt-7 space-y-2.5 border-t border-white/[0.08] pt-6 text-sm text-[#cfccd9]">
                <li className="flex items-center gap-2.5">
                  <Icon name="check" className="w-4 h-4 text-[#f58559] flex-shrink-0" />
                  Filter questions to specific files or one feature
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="check" className="w-4 h-4 text-[#f58559] flex-shrink-0" />
                  Built-in viewer highlights the exact quoted passage
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="check" className="w-4 h-4 text-[#f58559] flex-shrink-0" />
                  Export any conversation with citations to Markdown
                </li>
              </ul>
            </div>
          </div>

          {/* Row 2 */}
          <div id="workspaces" className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1 max-w-lg">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f58559]">
                Connected teams
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#f9fafb] leading-snug">
                Shared group chat, projects, and one timeline per feature.
              </h2>
              <p className="mt-4 text-base text-[#9e9ba8] leading-relaxed">
                Keep a private Personal space for solo research and create shared Groups for every team. Ask AI together
                in a live group room, link files to features, and let Munven build a living timeline of decisions and
                issues.
              </p>
              <ul className="mt-7 space-y-2.5 border-t border-white/[0.08] pt-6 text-sm text-[#cfccd9]">
                <li className="flex items-center gap-2.5">
                  <Icon name="check" className="w-4 h-4 text-[#f58559] flex-shrink-0" />
                  Toggle between Ask AI and Message group in real time
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="check" className="w-4 h-4 text-[#f58559] flex-shrink-0" />
                  Auto-tag work across Product, Dev, Design, Testing &amp; Management
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon name="check" className="w-4 h-4 text-[#f58559] flex-shrink-0" />
                  One-time 7-day employee invite links &amp; admin data controls
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-[#14131c]">
                <Image
                  src="/images/team-collab.jpg"
                  alt="Teammates discussing project decisions around a laptop in a bright meeting room"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover brightness-95"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#0c0b10]/70 via-transparent to-transparent pointer-events-none"
                  aria-hidden="true"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 rounded-xl bg-[#13121a]/90 backdrop-blur-md border border-white/10 px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs text-[#f1eff7] truncate">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                    Launch Squad · Group chat &amp; Feature timeline
                  </span>
                  <span className="text-[11px] font-medium text-[#f58559] flex-shrink-0">Live</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal 3-Step Flow */}
        <section id="how-it-works" className="border-t border-white/[0.06] py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f58559]">How it works</p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-[#f9fafb]">
                Simple from the first upload.
              </h2>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-10">
              {STEPS.map((step) => (
                <div key={step.number} className="border-t border-white/10 pt-5">
                  <span className="font-mono text-xs font-semibold text-[#f58559]">{step.number}</span>
                  <h3 className="mt-3 text-base font-semibold text-[#f9fafb]">{step.title}</h3>
                  <p className="mt-2 text-sm text-[#9e9ba8] leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Warm Obsidian + Coral Closing CTA */}
        <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-20">
          <div className="relative rounded-2xl border border-[#f58559]/35 bg-gradient-to-br from-[#231516] via-[#15121b] to-[#111018] p-8 sm:p-12 overflow-hidden">
            <div
              className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#f58559]/20 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#c24c28]/15 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="max-w-lg">
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f9fafb]">
                  Ready to make your company&apos;s knowledge actionable?
                </h2>
                <p className="mt-2.5 text-sm sm:text-base text-[#a6a3b2]">
                  Create a free private workspace or sign in to join your company team.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 flex-shrink-0">
                <Link
                  href="/register"
                  className="h-11 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ff966b] to-[#f27849] text-[#140e0e] text-sm font-semibold hover:brightness-105 shadow-[0_10px_30px_-8px_rgba(245,133,89,0.55)] transition"
                >
                  Get started free →
                </Link>
                <Link
                  href="/login"
                  className="h-11 px-6 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-sm font-medium text-[#f1eff7] hover:bg-white/[0.09] transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Obsidian Footer */}
      <footer className="border-t border-white/[0.07] bg-[#0a090e]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <MunvenMark className="w-6 h-6" />
            <span className="text-sm font-semibold tracking-tight text-[#f9fafb]">Munven</span>
            <span className="text-xs text-[#6f6c7c]">· internal company workspace</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#9e9ba8]">
            <a href="#features" className="hover:text-[#f9fafb] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#f9fafb] transition-colors">How it works</a>
            <Link href="/login" className="hover:text-[#f9fafb] transition-colors">Sign in</Link>
            <Link href="/register" className="font-medium text-[#f58559] hover:text-[#ff9b73] transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
