"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon, IconName } from "./ui";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#teams", label: "Teams" },
  { href: "#workspaces", label: "Workspaces" },
];

/** Geometric warm-coral "M" brand emblem matching the landing page aesthetic. */
export function MunvenMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 24.5V10.5C5 8.5 7.4 7.5 8.8 8.9L16 16.1L23.2 8.9C24.6 7.5 27 8.5 27 10.5V24.5"
        stroke="#f58559"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="22.5" r="2.2" fill="#f58559" />
    </svg>
  );
}

/** Minimal obsidian top navigation bar with coral CTA. */
export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0c0b10]/80 backdrop-blur-md border-b border-white/[0.07]">
      <div className="max-w-7xl mx-auto h-full px-5 sm:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <MunvenMark className="w-7 h-7 transition-transform group-hover:scale-105" />
          <span className="text-lg font-semibold tracking-tight text-[#f9fafb]">Munven</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7" aria-label="Landing navigation">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-[#a6a3b2] hover:text-[#f9fafb] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2.5">
          <Link
            href="/login"
            className="h-9 px-4 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] text-sm font-medium text-[#f1eff7] hover:bg-white/[0.08] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#ff966b] to-[#f27849] text-[#140e0e] text-sm font-semibold hover:brightness-105 shadow-[0_6px_22px_-6px_rgba(245,133,89,0.55)] transition"
          >
            Get started
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/15 bg-white/[0.04] text-[#f1eff7]"
        >
          <Icon name={mobileOpen ? "close" : "menu"} className="w-4.5 h-4.5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="sm:hidden bg-[#121118] border-b border-white/10 px-5 py-4 space-y-1 shadow-2xl animate-fade-in">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-[#c5c2d1] hover:text-[#f9fafb]"
            >
              {item.label}
            </a>
          ))}
          <div className="pt-3 mt-2 border-t border-white/10 grid grid-cols-2 gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="h-10 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-[#f1eff7] text-sm font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="h-10 inline-flex items-center justify-center rounded-xl bg-gradient-to-b from-[#ff966b] to-[#f27849] text-[#140e0e] text-sm font-semibold"
            >
              Get started →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

type ActionKey = "summarize" | "find" | "explain" | "timeline";

const QUICK_ACTIONS: {
  key: ActionKey;
  icon: IconName;
  iconColor: string;
  title: string;
  subtitle: string;
  prompt: string;
  answer: string;
  source: string;
  where: string;
}[] = [
  {
    key: "summarize",
    icon: "fileText",
    iconColor: "text-[#f58559]",
    title: "Summarize",
    subtitle: "A document or chat",
    prompt: "Summarize the Q4 Product Roadmap milestones",
    answer: "Phase 1 ships Apple Pay & saved cards; mobile promo-code field collapses behind a toggle.",
    source: "Product Roadmap Q4.pdf",
    where: "Page 4",
  },
  {
    key: "find",
    icon: "search",
    iconColor: "text-[#a6a3b2]",
    title: "Find",
    subtitle: "Specific information",
    prompt: "Where did Maya review the mobile checkout flow?",
    answer: "At 02:18 in Design Review Oct, Maya walks through the simplified mobile cart layout.",
    source: "Design Review Oct.mp4",
    where: "02:18",
  },
  {
    key: "explain",
    icon: "sparkles",
    iconColor: "text-[#6ee7b7]",
    title: "Explain",
    subtitle: "A concept or decision",
    prompt: "Why is payment latency capped at 400 ms?",
    answer: "QA benchmarks hit 340 ms P95 across 5,000 checkouts — keeping conversion drop under 1%.",
    source: "QA Latency Bench.xlsx",
    where: "Sheet: P95",
  },
  {
    key: "timeline",
    icon: "timeline",
    iconColor: "text-[#fbbf24]",
    title: "Timeline",
    subtitle: "Decisions & changes",
    prompt: "Show latest decisions linked to Checkout",
    answer: "4 AI-extracted entries across Product, Design, Dev, and QA — 1 open 360px modal issue.",
    source: "Checkout Redesign",
    where: "Feature timeline",
  },
];

const SIDEBAR_ITEMS: { icon: IconName; label: string; active?: boolean }[] = [
  { icon: "dashboard", label: "Home", active: true },
  { icon: "sparkles", label: "Ask Munven" },
  { icon: "fileText", label: "Knowledge" },
  { icon: "groupChat", label: "Group chat" },
  { icon: "projects", label: "Projects" },
  { icon: "users", label: "Groups" },
];

const RECENT_KNOWLEDGE: {
  name: string;
  meta: string;
  badgeColor: string;
  icon: IconName;
}[] = [
  { name: "Product Roadmap Q4", meta: "PDF · 2.4 MB", badgeColor: "bg-[#ef4444]/15 text-[#f87171]", icon: "fileText" },
  { name: "Architecture Overview", meta: "DOCX · 1.1 MB", badgeColor: "bg-[#3b82f6]/15 text-[#60a5fa]", icon: "fileText" },
  { name: "Design Review Oct", meta: "MP4 · 02:18 · Team Product", badgeColor: "bg-[#f58559]/15 text-[#f58559]", icon: "video" },
];

/**
 * Floating angled Munven workspace preview with warm coral rim glow and interactive quick-action cards.
 */
export function HeroWorkspaceFrame() {
  const [selectedAction, setSelectedAction] = useState<ActionKey | null>(null);
  const active = QUICK_ACTIONS.find((a) => a.key === selectedAction) ?? null;

  return (
    <div className="relative flex items-center justify-center py-4 lg:py-0">
      {/* Ambient copper/coral glow orbs & curved orbital light behind the floating window */}
      <div
        className="pointer-events-none absolute -inset-6 sm:-inset-10"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] h-[85%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,133,89,0.28)_0%,rgba(194,76,40,0.12)_42%,transparent_72%)] blur-2xl" />
        <div className="absolute -left-8 top-1/3 w-48 h-48 rounded-full border border-[#f58559]/30 bg-gradient-to-br from-[#f58559]/20 via-[#c24c28]/10 to-transparent blur-[1px]" />
        <div className="absolute -right-6 bottom-6 w-56 h-56 rounded-full border border-[#f58559]/25 bg-gradient-to-tl from-[#ff966b]/25 via-transparent to-transparent" />
      </div>

      {/* Slightly angled floating workspace card (straightens smoothly on hover) */}
      <div
        className="relative w-full max-w-[35rem] rounded-2xl p-[1px] bg-gradient-to-br from-[#f58559]/55 via-white/15 to-white/5 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85),0_0_50px_-15px_rgba(245,133,89,0.3)] transition-transform duration-500 ease-out lg:[transform:perspective(1300px)_rotateY(-7deg)_rotateX(2deg)] lg:hover:[transform:perspective(1300px)_rotateY(-2deg)_rotateX(0deg)]"
      >
        <div className="rounded-[15px] bg-[#13121a]/95 backdrop-blur-xl overflow-hidden grid grid-cols-12">
          {/* Mini Left Sidebar */}
          <div className="hidden sm:flex sm:col-span-4 flex-col justify-between border-r border-white/[0.07] bg-[#100f16] p-3.5">
            <div>
              <div className="flex items-center gap-2 px-2 py-1">
                <MunvenMark className="w-5 h-5" />
                <span className="text-sm font-semibold tracking-tight text-[#f9fafb]">Munven</span>
              </div>

              <ul className="mt-4 space-y-1">
                {SIDEBAR_ITEMS.map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                      item.active
                        ? "bg-gradient-to-r from-[#f58559]/35 via-[#f58559]/15 to-transparent text-[#fff4ef] border border-[#f58559]/25"
                        : "text-[#8e8b9c]"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      className={`w-3.5 h-3.5 ${item.active ? "text-[#f58559]" : "text-[#6f6c7c]"}`}
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 mt-6 border-t border-white/[0.06] space-y-1 text-xs text-[#7e7b8c]">
              <div className="flex items-center gap-2.5 px-2.5 py-1.5">
                <Icon name="building" className="w-3.5 h-3.5" />
                Admin
              </div>
              <div className="flex items-center gap-2.5 px-2.5 py-1.5">
                <Icon name="settings" className="w-3.5 h-3.5" />
                Settings
              </div>
            </div>
          </div>

          {/* Main Workspace Preview Pane */}
          <div className="col-span-12 sm:col-span-8 p-4 sm:p-5 flex flex-col justify-between">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex sm:hidden items-center gap-2">
                <MunvenMark className="w-5 h-5" />
                <span className="text-xs font-semibold text-[#f9fafb]">Munven</span>
              </div>
              <div className="ml-auto flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-white/[0.05] border border-white/10 text-[#9e9ba8] flex items-center justify-center">
                  <Icon name="info" className="w-3 h-3" />
                </span>
                <span className="w-6 h-6 rounded-full bg-[#f58559] text-[#140e0e] text-[11px] font-bold flex items-center justify-center">
                  R
                </span>
              </div>
            </div>

            {/* Greeting & Ask input */}
            <div>
              <p className="text-base sm:text-lg font-semibold text-[#f9fafb] tracking-tight">
                Good afternoon, Rashi <span aria-hidden="true">👋</span>
              </p>
              <p className="text-xs text-[#8f8c9d] mt-0.5">What would you like to know today?</p>

              <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-[#1a1824] border border-white/10 px-3 py-2">
                <span className="flex-1 text-xs text-[#8f8c9d] truncate">
                  {active ? active.prompt : "Ask anything about your work, docs, or projects..."}
                </span>
                <Icon name="link" className="w-3.5 h-3.5 text-[#6f6c7c] flex-shrink-0" />
                <button
                  type="button"
                  aria-label="Preview next action"
                  onClick={() => {
                    const idx = QUICK_ACTIONS.findIndex((a) => a.key === selectedAction);
                    setSelectedAction(QUICK_ACTIONS[(idx + 1) % QUICK_ACTIONS.length].key);
                  }}
                  className="w-6 h-6 rounded-lg bg-[#f58559] text-[#140e0e] flex items-center justify-center flex-shrink-0 hover:brightness-110 transition cursor-pointer"
                >
                  <Icon name="chevronRight" className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Quick Action Cards (interactive) */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const isSelected = selectedAction === action.key;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      onClick={() => setSelectedAction(isSelected ? null : action.key)}
                      className={`text-left rounded-xl p-2.5 border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#f58559]/12 border-[#f58559]/50"
                          : "bg-[#191722] border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <Icon name={action.icon} className={`w-3.5 h-3.5 ${action.iconColor}`} />
                      <p className="mt-1.5 text-[11px] font-semibold text-[#f2f0f7]">{action.title}</p>
                      <p className="text-[10px] text-[#7f7c8d] leading-tight mt-0.5 line-clamp-2">{action.subtitle}</p>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic answer preview when a quick action is clicked, otherwise Recent knowledge */}
              {active ? (
                <div className="mt-3.5 rounded-xl bg-[#1a1724] border border-[#f58559]/35 p-3 animate-fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#f58559]">
                      <Icon name="sparkles" className="w-3 h-3" />
                      Munven AI
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAction(null)}
                      className="text-[10px] text-[#8f8c9d] hover:text-[#f9fafb] cursor-pointer"
                    >
                      Back to recent
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[#e5e2ee] leading-relaxed">{active.answer}</p>
                  <p className="mt-2 text-[10px] text-[#f58559]/90 font-medium">
                    [Source 1] {active.source} · {active.where}
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-semibold text-[#e6e4ef]">Recent knowledge</span>
                    <span className="text-[#f58559] font-medium">View all →</span>
                  </div>
                  <ul className="space-y-1.5">
                    {RECENT_KNOWLEDGE.map((item) => (
                      <li
                        key={item.name}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[#191722]/90 border border-white/[0.06] px-2.5 py-2"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${item.badgeColor}`}>
                            <Icon name={item.icon} className="w-3 h-3" />
                          </span>
                          <span className="text-[11px] font-medium text-[#e9e7f2] truncate">{item.name}</span>
                        </span>
                        <span className="text-[10px] text-[#7c798a] flex-shrink-0">{item.meta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
