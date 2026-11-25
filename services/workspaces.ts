import { fetchApi } from "./api";
import { Member, Role, Workspace } from "../types/index";

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    return fetchApi("/workspaces", { method: "GET" });
  },

  async create(name: string): Promise<Workspace> {
    return fetchApi("/workspaces", { method: "POST", body: JSON.stringify({ name }) });
  },

  async rename(id: string, name: string): Promise<Workspace> {
    return fetchApi(`/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
  },

  async remove(id: string): Promise<void> {
    await fetchApi(`/workspaces/${id}`, { method: "DELETE" });
  },

  async members(id: string): Promise<Member[]> {
    return fetchApi(`/workspaces/${id}/members`, { method: "GET" });
  },

  async addMember(id: string, email: string, role: Exclude<Role, "owner">): Promise<Member> {
    return fetchApi(`/workspaces/${id}/members`, { method: "POST", body: JSON.stringify({ email, role }) });
  },

  async updateRole(id: string, userId: string, role: Exclude<Role, "owner">): Promise<Member> {
    return fetchApi(`/workspaces/${id}/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role }) });
  },

  /** Remove a member, or leave the workspace when userId is your own id. */
  async removeMember(id: string, userId: string): Promise<void> {
    await fetchApi(`/workspaces/${id}/members/${userId}`, { method: "DELETE" });
  },
};
