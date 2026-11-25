import { ReactNode } from "react";
import WorkspaceShell from "../components/WorkspaceShell";

// Sidebar, header and workspace state for the logged-in pages (see WorkspaceShell).
// Instant-navigation validation is switched off for the whole app in app/layout.tsx.
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
