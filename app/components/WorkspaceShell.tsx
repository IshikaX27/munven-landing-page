"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usersService } from "../../services/users";
import { authService } from "../../services/auth";
import { workspaceService } from "../../services/workspaces";
import { projectService } from "../../services/projects";
import { AUTH_DISABLED, getActiveWorkspaceId, isSignedIn, setActiveWorkspaceId } from "../../services/api";
import { Project, UserResponse, Workspace } from "../../types/index";
import { WorkspaceContext } from "./WorkspaceContext";
import { Avatar, Badge, Icon, IconButton, IconName, Spinner } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/group-chat", label: "Group chat", icon: "groupChat" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/team", label: "Groups", icon: "users" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/company", label: "Company", icon: "building" },
  { href: "/data", label: "Data", icon: "database" },
];

/**
 * Sidebar, header and workspace state shared by Dashboard, Group chat, Projects, Groups and Company.
 * Everything here needs the logged-in user, so it renders in the browser.
 */
export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sidebarSlot, setSidebarSlot] = useState<HTMLElement | null>(null);
  // Small screens: the sidebar slides in over the page
  const [mobileOpen, setMobileOpen] = useState(false);

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await projectService.list());
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    const list = await workspaceService.list();
    setWorkspaces(list);
    // Keep the stored workspace if we're still a member of it, else fall back to Personal
    const stored = getActiveWorkspaceId();
    const active = list.find((w) => w.id === stored) || list.find((w) => w.is_personal) || list[0];
    setActiveWorkspaceId(active?.id || null);
    setWorkspaceId(active?.id || null);
    if (active && active.id !== stored) {
      setProjects([]);
    }
    await refreshProjects();
  }, [refreshProjects]);

  // Set when the server can't be reached; the user stays logged in and can retry
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        setUser(await usersService.getCurrentUser());
        await refreshWorkspaces();
        setLoadError(null);
      } catch (err) {
        // A rejected login already cleared the token (see throwApiError); anything else (server
        // restarting, network down) must not log the user out
        if (!isSignedIn()) {
          authService.logout();
          router.push("/login");
        } else {
          // fetch() rejects with a TypeError ("Failed to fetch") when the server is unreachable
          setLoadError(
            err instanceof TypeError || !(err instanceof Error) ? "the server could not be reached." : err.message
          );
        }
      }
    };
    init();
  }, [router, refreshWorkspaces, loadAttempt]);

  // On a phone, picking a chat (or starting one) in the page's sidebar content closes the menu. Pages
  // render that content through a portal, whose React events never reach this component, so this
  // listens on the DOM node itself.
  useEffect(() => {
    if (!sidebarSlot) return;
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-closes-menu]")) setMobileOpen(false);
    };
    sidebarSlot.addEventListener("click", onClick);
    return () => sidebarSlot.removeEventListener("click", onClick);
  }, [sidebarSlot]);

  const switchWorkspace = useCallback(
    (id: string) => {
      // Stored first so every request from the remounted page already uses the new workspace
      setActiveWorkspaceId(id);
      setProjects([]);
      setWorkspaceId(id);
      refreshProjects();
    },
    [refreshProjects]
  );

  const featureLabel = useCallback(
    (featureId?: string | null) => {
      if (!featureId) return "";
      for (const project of projects) {
        const feature = project.features.find((f) => f.id === featureId);
        if (feature) return `${project.name} › ${feature.name}`;
      }
      return "Unknown feature";
    },
    [projects]
  );

  const workspace = workspaces.find((w) => w.id === workspaceId);

  const contextValue = useMemo(
    () =>
      user && workspace
        ? {
            user, setUser, workspaces, workspace, switchWorkspace, refreshWorkspaces,
            projects, refreshProjects, featureLabel, sidebarSlot,
          }
        : null,
    [user, workspaces, workspace, switchWorkspace, refreshWorkspaces, projects, refreshProjects, featureLabel, sidebarSlot]
  );

  if (!contextValue || !workspace) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-500 px-4 text-center">
        <Logo />
        {loadError ? (
          <>
            <p className="text-sm text-gray-600">Munven could not load: {loadError}</p>
            <button
              onClick={() => {
                setLoadError(null);
                setLoadAttempt((n) => n + 1);
              }}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Try again
            </button>
          </>
        ) : (
          <Spinner className="w-5 h-5 text-blue-600" />
        )}
      </div>
    );
  }

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

  const adminNav = user?.is_admin ? ADMIN_NAV : [];
  const current = [...NAV, ...adminNav].find((item) => pathname === item.href);

  const navLink = (item: NavItem) => {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon name={item.icon} className={`w-4.5 h-4.5 ${active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`} />
        {item.label}
      </Link>
    );
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile: dim the page while the sidebar is open */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 bg-gray-900/30 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 z-40 h-dvh w-64 bg-white border-r border-gray-200/70 flex-shrink-0 flex flex-col
            transition-[transform,visibility] lg:translate-x-0 ${
              // Closed on a phone: also invisible, so keyboard focus and screen readers skip the hidden menu
              mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full max-lg:invisible"
            }`}
        >
          <div className="h-16 px-5 flex items-center justify-between border-b border-gray-100">
            <Logo />
            <IconButton icon="close" label="Close menu" className="lg:hidden" onClick={() => setMobileOpen(false)} />
          </div>

          {/* Group switcher */}
          <div className="px-3 pt-4">
            <label htmlFor="workspace-switcher" className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-2">
              Group
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name={workspace.is_personal ? "key" : "users"} className="w-4 h-4" />
              </span>
              <select
                id="workspace-switcher"
                value={workspace.id}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="w-full h-10 pl-9 pr-8 appearance-none rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition cursor-pointer"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.is_personal ? "Personal (private)" : w.name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="chevronDown" className="w-4 h-4" />
              </span>
            </div>
          </div>

          <nav className="mt-4 px-3 space-y-0.5" aria-label="Main">
            {NAV.map(navLink)}
            {adminNav.length > 0 && (
              <>
                <p className="pt-4 pb-1 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
                {adminNav.map(navLink)}
              </>
            )}
          </nav>

          {/* Page-specific sidebar content (the dashboard renders its chat list here) */}
          <div ref={setSidebarSlot} className="mt-5 px-3 flex-1 flex flex-col min-h-0 overflow-hidden" />

          {/* Signed-in user */}
          <div className="border-t border-gray-100 p-3 flex items-center gap-3">
            <Avatar name={user?.name} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            {!AUTH_DISABLED && <IconButton icon="logout" label="Logout" onClick={handleLogout} />}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-16 bg-white/80 backdrop-blur border-b border-gray-200/70 px-4 sm:px-8 flex items-center gap-3 sticky top-0 z-20">
            <IconButton icon="menu" label="Open menu" className="lg:hidden -ml-1" onClick={() => setMobileOpen(true)} />
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-gray-900 truncate">{current?.label || "Munven"}</h1>
              <h2 className="text-xs text-gray-500 truncate">
                Welcome, {user?.name} ·{" "}
                {workspace.is_personal ? "Personal (only you)" : `${workspace.name} (${workspace.role})`}
              </h2>
            </div>
            {!workspace.is_personal && <Badge tone="blue">{workspace.member_count} members</Badge>}
          </header>

          <main className="flex-1 p-4 sm:p-8 min-w-0">
            {/* Remount pages on workspace switch so they load the new workspace's data */}
            <div key={workspace.id} className="animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
        <Icon name="sparkles" className="w-4.5 h-4.5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-gray-900">Munven</span>
    </span>
  );
}
