import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FeedbackProvider } from "./components/Feedback";
import { THEME_BOOT_SCRIPT, ThemeSync } from "./components/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Munven",
  description: "Ask questions about your company's documents, videos and data",
};

// Every page is a client page that loads its data in the browser after login, so there is no static
// shell for Next.js to validate for instant navigation. Without this, the dev overlay reports each
// page as "dropped from rendering".
export const instant = { unstable_disableValidation: true };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme script below adds class="dark" before React hydrates
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
