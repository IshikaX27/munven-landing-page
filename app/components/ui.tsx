"use client";

/**
 * Shared UI building blocks so every page looks the same: icons, buttons, cards, badges, avatars,
 * spinners and empty states. Colours follow the Munven scheme: gray-50 background, white surfaces,
 * blue-600 as the accent, red for destructive actions.
 */
import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, useState } from "react";

// --- Icons (inline SVG, 24x24 stroke icons) -------------------------------------------------------

const ICON_PATHS: Record<string, ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12Z" />,
  groupChat: (<><path d="M17 8.5a5.5 5.5 0 0 1-8 4.9L5 14.5l.9-3.4A5.5 5.5 0 1 1 17 8.5Z" /><path d="M19.5 10.5A5 5 0 0 1 17 19.6l2.5.9-.6-2.8" /></>),
  projects: (<><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M8 13h8" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18.5 14a6.5 6.5 0 0 1 3 6" /></>),
  building: (<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></>),
  database: (<><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>),
  upload: (<><path d="M7 17a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5a3.8 3.8 0 0 1-.5 7.5" /><path d="M12 12v8M8.5 15.5 12 12l3.5 3.5" /></>),
  file: (<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></>),
  fileText: (<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>),
  image: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 9" /></>),
  video: (<><rect x="2.5" y="6" width="13" height="12" rx="2" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></>),
  audio: (<><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>),
  sheet: (<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></>),
  slides: (<><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8 20h8" /></>),
  trash: (<><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></>),
  external: (<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  send: (<><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4Z" /></>),
  sparkles: (<><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8Z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" /></>),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (<><path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9.5v4M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  link: (<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>),
  pencil: (<><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z" /><path d="m13.5 6.5 4 4" /></>),
  copy: (<><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>),
  bot: (<><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01M9.5 17h5" /></>),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  timeline: (<><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><path d="M6 8v8M10 6h10M10 18h10M10 12h7" /></>),
  key: (<><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M14 9l2 2" /></>),
  settings: (<><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  monitor: (<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  thumbUp: (<><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" /><path d="M7 10l4-7a2.5 2.5 0 0 1 2.5 3L13 10h6a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 21H7" /></>),
  thumbDown: (<><path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1Z" /><path d="M17 14l-4 7a2.5 2.5 0 0 1-2.5-3L11 14H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 3H17" /></>),
  download: (<><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>),
  eye: (<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></>),
};

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, className = "w-4 h-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

/** Icon + colour for a file type (pdf, docx, mp4, ...). */
export function fileVisual(fileType: string): { icon: IconName; className: string } {
  const t = fileType.toLowerCase();
  if (t === "pdf") return { icon: "fileText", className: "bg-red-50 text-red-600" };
  if (["doc", "docx", "rtf", "txt", "md"].includes(t)) return { icon: "fileText", className: "bg-blue-50 text-blue-600" };
  if (["xls", "xlsx", "csv", "tsv"].includes(t)) return { icon: "sheet", className: "bg-green-50 text-green-600" };
  if (["ppt", "pptx"].includes(t)) return { icon: "slides", className: "bg-orange-50 text-orange-600" };
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"].includes(t)) return { icon: "image", className: "bg-purple-50 text-purple-600" };
  if (["mp4", "mov", "avi", "webm", "mpeg", "mpg", "wmv", "flv", "3gp"].includes(t)) return { icon: "video", className: "bg-pink-50 text-pink-600" };
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac", "aiff"].includes(t)) return { icon: "audio", className: "bg-amber-50 text-amber-600" };
  return { icon: "file", className: "bg-gray-100 text-gray-600" };
}

export function FileIcon({ fileType, size = "md" }: { fileType: string; size?: "sm" | "md" }) {
  const { icon, className } = fileVisual(fileType);
  const box = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  return (
    <span className={`${box} ${className} rounded-lg flex items-center justify-center flex-shrink-0`}>
      <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5"} />
    </span>
  );
}

// --- Buttons ---------------------------------------------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  "danger-ghost": "text-red-600 hover:bg-red-50",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
}

export function Button({ variant = "primary", size = "md", icon, loading, className = "", children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap
        disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading ? <Spinner className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} /> : icon && <Icon name={icon} className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}

/** Square icon-only button (rename, delete, close...) with an accessible label. */
export function IconButton({ icon, label, variant = "ghost", className = "", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; variant?: Variant }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      <Icon name={icon} className="w-4 h-4" />
    </button>
  );
}

// --- Surfaces & text -------------------------------------------------------------------------------

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`bg-white rounded-xl border border-gray-200/70 shadow-sm ${className}`}>{children}</section>;
}

export function CardHeader({ title, description, action, icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Icon name={icon} className="w-4.5 h-4.5" />
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  );
}

const BADGE_TONES = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100",
  green: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-100",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  red: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100",
};

export function Badge({ tone = "gray", children, dot }: { tone?: keyof typeof BADGE_TONES; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${BADGE_TONES[tone]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Document status as a coloured pill. */
export function StatusBadge({ status, media }: { status: string; media?: boolean }) {
  if (status === "ready") return <Badge tone="green" dot>Ready</Badge>;
  if (status === "failed") return <Badge tone="red" dot>Failed</Badge>;
  if (status === "invited") return <Badge tone="amber" dot>Invite pending</Badge>;
  if (status === "active") return <Badge tone="green" dot>Active</Badge>;
  if (status === "deactivated") return <Badge tone="gray" dot>Deactivated</Badge>;
  return (
    <Badge tone="amber">
      <Spinner className="w-3 h-3" />
      {media ? "Watching / listening" : "Processing"}
    </Badge>
  );
}

const AVATAR_COLOURS = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700"];

export function Avatar({ name, size = "md" }: { name?: string | null; size?: "sm" | "md" }) {
  const label = (name || "?").trim();
  const initials = label.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  // Same person, same colour
  const colour = AVATAR_COLOURS[[...label].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLOURS.length];
  const box = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-xs";
  return <span className={`${box} ${colour} rounded-full font-semibold flex items-center justify-center flex-shrink-0`}>{initials}</span>;
}

export function AiAvatar() {
  return (
    <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
      <Icon name="sparkles" className="w-4 h-4" />
    </span>
  );
}

export function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Three bouncing dots, e.g. while the AI writes an answer. */
export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Working">
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" />
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <span className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <p className="font-medium text-gray-800">{title}</p>
      {children && <div className="text-sm text-gray-500 mt-1 max-w-sm">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />;
}

export const inputClass =
  "w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 transition";

/** Password box with an eye button that shows or hides what was typed. */
export function PasswordInput({ className = inputClass, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 w-10 flex items-center justify-center rounded-r-lg text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:text-blue-600"
      >
        <Icon name={visible ? "eyeOff" : "eye"} />
      </button>
    </span>
  );
}

export const selectClass =
  "h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition";
