import { API_URL, fetchApi, getAuthHeaders, setSignedIn } from "./api";
import { UserCreate, LoginCredentials, TokenResponse, UserResponse } from "../types/index";

export const authService = {
  async register(data: UserCreate): Promise<UserResponse> {
    return fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      // The server answers with the httpOnly session cookie
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || "Login failed");
    }
    const data = await response.json();
    setSignedIn(true);
    return data;
  },

  /** Whether sign-up is open, and whether the next account is the very first one (the company admin). */
  async registrationOpen(): Promise<{ open: boolean; first_account: boolean }> {
    const status: { open: boolean; first_account?: boolean } = await fetchApi("/auth/registration-open", { method: "GET" });
    return { open: status.open, first_account: Boolean(status.first_account) };
  },

  /** Who an invite / password-reset link is for. */
  async inviteInfo(token: string): Promise<{ name: string; email: string }> {
    return fetchApi(`/auth/invite/${encodeURIComponent(token)}`, { method: "GET" });
  },

  /** Sets the password with an invite link and signs the employee in. */
  async acceptInvite(token: string, password: string): Promise<TokenResponse> {
    const data: TokenResponse = await fetchApi(`/auth/invite/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setSignedIn(true);
    if (typeof window !== "undefined") localStorage.removeItem("workspaceId");
    return data;
  },

  logout() {
    // Only the server can remove the httpOnly session cookie
    fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include", headers: getAuthHeaders() }).catch(
      () => undefined
    );
    setSignedIn(false);
    if (typeof window !== "undefined") {
      // The next person to log in on this browser must not start in a team they don't belong to
      localStorage.removeItem("workspaceId");
    }
  },
};
