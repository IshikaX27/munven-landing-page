import { fetchApi } from "./api";
import { UserResponse } from "../types/index";

export const usersService = {
  async getCurrentUser(): Promise<UserResponse> {
    return fetchApi("/users/me", {
      method: "GET",
    });
  },

  async updateProfile(name: string): Promise<UserResponse> {
    return fetchApi("/users/me", { method: "PATCH", body: JSON.stringify({ name }) });
  },

  /** Other devices are signed out; this browser receives a fresh session cookie. */
  async changePassword(currentPassword: string, newPassword: string): Promise<UserResponse> {
    return fetchApi("/users/me/password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },

  /** Permanently deletes the account and everything in its Personal workspace. */
  async deleteAccount(password: string): Promise<void> {
    await fetchApi("/users/me/delete", { method: "POST", body: JSON.stringify({ password }) });
  },
};
