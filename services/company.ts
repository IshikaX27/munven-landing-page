import { fetchApi } from "./api";
import { DirectoryEntry, Employee, InviteResult } from "../types/index";

/** The link an employee opens to set their password (also used for password resets). */
export const inviteUrl = (token: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${token}`;

export const companyService = {
  async employees(): Promise<Employee[]> {
    return fetchApi("/company/employees", { method: "GET" });
  },

  async addEmployee(name: string, email: string, isAdmin: boolean, groupIds: string[]): Promise<InviteResult> {
    return fetchApi("/company/employees", {
      method: "POST",
      body: JSON.stringify({ name, email, is_admin: isAdmin, group_ids: groupIds }),
    });
  },

  /** New invite link, or a password-reset link for an employee who already has a password. */
  async newInvite(userId: string): Promise<InviteResult> {
    return fetchApi(`/company/employees/${userId}/invite`, { method: "POST" });
  },

  async update(userId: string, data: { name?: string; is_admin?: boolean; is_active?: boolean }): Promise<Employee> {
    return fetchApi(`/company/employees/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
  },

  /** Everyone who can be added to a group. */
  async directory(): Promise<DirectoryEntry[]> {
    return fetchApi("/company/directory", { method: "GET" });
  },
};
