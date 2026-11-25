export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const WORKSPACE_KEY = "workspaceId";
// Only a hint that someone signed in on this browser (not a secret): the login itself is an
// httpOnly cookie that page scripts can never read
const SIGNED_IN_KEY = "signedIn";

// TEMPORARY, local testing only: no login or sign-up pages; the backend (AUTH_DISABLED) acts as the admin
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

export const isSignedIn = (): boolean =>
  AUTH_DISABLED || (typeof window !== "undefined" && localStorage.getItem(SIGNED_IN_KEY) === "1");

export const setSignedIn = (signedIn: boolean) => {
  if (typeof window === "undefined") return;
  // Tokens from before cookie sessions must not linger in storage
  localStorage.removeItem("token");
  if (signedIn) localStorage.setItem(SIGNED_IN_KEY, "1");
  else localStorage.removeItem(SIGNED_IN_KEY);
};

/** The workspace every API call acts in (sent as X-Workspace-Id; the backend falls back to Personal). */
export const getActiveWorkspaceId = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem(WORKSPACE_KEY) : null;

export const setActiveWorkspaceId = (id: string | null) => {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(WORKSPACE_KEY, id);
  else localStorage.removeItem(WORKSPACE_KEY);
};

/**
 * Headers for every API request: the workspace, and the header the backend requires on
 * cookie-authenticated changes (other sites cannot send it, which blocks CSRF).
 * Requests must also use credentials: "include" so the session cookie is sent.
 */
export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { "X-Munven-Client": "web" };
  const workspaceId = getActiveWorkspaceId();
  if (workspaceId) headers["X-Workspace-Id"] = workspaceId;
  return headers;
};

/**
 * Throws an Error with the backend's message. A 401 on an authenticated request means the
 * login expired or is invalid, so the stored token is cleared and the user sent to /login.
 */
export const throwApiError = async (response: Response, fallback: string): Promise<never> => {
  const errorData = await response.json().catch(() => ({}));
  if (response.status === 401 && isSignedIn() && !AUTH_DISABLED) {
    setSignedIn(false);
    window.location.href = "/login";
  }
  throw new Error(errorData?.error?.message || fallback);
};

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  Object.entries(getAuthHeaders()).forEach(([name, value]) => {
    if (!headers.has(name)) headers.set(name, value);
  });

  const response = await fetch(`${API_URL}/api/v1${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    await throwApiError(response, "An error occurred");
  }

  return response.json();
};
