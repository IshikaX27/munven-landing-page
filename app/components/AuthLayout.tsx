"use client";

import { ReactNode } from "react";
import { Icon, IconName } from "./ui";

const HIGHLIGHTS: { icon: IconName; title: string; text: string }[] = [
  { icon: "fileText", title: "Every format", text: "PDFs, Office files, spreadsheets, images, video and audio." },
  { icon: "sparkles", title: "Answers with sources", text: "Open the exact page or video moment an answer comes from." },
  { icon: "users", title: "Built for teams", text: "Groups, shared chats and one timeline per feature." },
];

/** Two-column frame for sign in / register / invite: brand panel on the left, form on the right. */
export default function AuthLayout({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50">
      <aside className="hidden lg:flex flex-col justify-between bg-blue-600 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-white text-blue-600 flex items-center justify-center shadow">
            <Icon name="sparkles" className="w-5 h-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">Munven</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">Your company&apos;s knowledge, one question away.</h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.title} className="flex gap-3">
                <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon name={h.icon} className="w-4.5 h-4.5" />
                </span>
                <span>
                  <span className="block font-medium">{h.title}</span>
                  <span className="block text-sm text-white/75">{h.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">Munven · internal company workspace</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Icon name="sparkles" className="w-4.5 h-4.5" />
            </span>
            <span className="text-lg font-bold text-gray-900">Munven</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Labelled form field used by the auth pages. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
      <Icon name="alert" className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
