"use client";

import { createContext, useContext } from "react";
import { Project, UserResponse, Workspace } from "../../types/index";

export interface WorkspaceContextValue {
  user: UserResponse;
  /** Replace the signed-in user's details after they change them (name on the Settings page) */
  setUser: (user: UserResponse) => void;
  workspaces: Workspace[];
  /** The workspace every page and API call currently acts in */
  workspace: Workspace;
  switchWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  /** Projects and features of the current workspace (for linking and feature scopes) */
  projects: Project[];
  refreshProjects: () => Promise<void>;
  /** "Mobile App › Checkout" for a feature id */
  featureLabel: (featureId?: string | null) => string;
  /** Element in the sidebar where a page can render extra content (the dashboard's chat list) */
  sidebarSlot: HTMLElement | null;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside the workspace layout");
  return value;
}
