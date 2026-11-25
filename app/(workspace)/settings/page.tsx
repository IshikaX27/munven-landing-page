"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../../../services/auth";
import { setActiveWorkspaceId, setSignedIn } from "../../../services/api";
import { usersService } from "../../../services/users";
import { useWorkspace } from "../../components/WorkspaceContext";
import { useFeedback } from "../../components/Feedback";
import { getThemePreference, setThemePreference, ThemePreference } from "../../components/theme";
import { Avatar, Badge, Button, Card, CardHeader, Icon, IconName, PasswordInput, inputClass } from "../../components/ui";

const THEMES: { value: ThemePreference; label: string; description: string; icon: IconName }[] = [
  { value: "light", label: "Light", description: "Bright background with white cards.", icon: "sun" },
  { value: "dark", label: "Dark", description: "Easier on the eyes in low light.", icon: "moon" },
  { value: "system", label: "System", description: "Match your computer's setting.", icon: "monitor" },
];

/** Tiny mock of the app in a theme, shown on each appearance option. */
function ThemePreview({ theme }: { theme: ThemePreference }) {
  const pane = (dark: boolean) => (
    <div className={`h-full flex gap-1.5 p-2 ${dark ? "bg-[#0d1219]" : "bg-[#f9fafb]"}`}>
      <div className={`w-1/4 rounded-md ${dark ? "bg-[#151c26]" : "bg-white"} p-1.5 space-y-1`}>
        <div className="h-1.5 rounded-full bg-[#3b82f6]" />
        <div className={`h-1.5 rounded-full ${dark ? "bg-[#283241]" : "bg-[#e5e7eb]"}`} />
        <div className={`h-1.5 rounded-full ${dark ? "bg-[#283241]" : "bg-[#e5e7eb]"}`} />
      </div>
      <div className={`flex-1 rounded-md ${dark ? "bg-[#151c26]" : "bg-white"} p-1.5 space-y-1`}>
        <div className={`h-1.5 w-2/3 rounded-full ${dark ? "bg-[#384354]" : "bg-[#d1d5db]"}`} />
        <div className={`h-1.5 w-1/2 rounded-full ${dark ? "bg-[#283241]" : "bg-[#e5e7eb]"}`} />
        <div className="h-3 w-1/3 rounded bg-[#3b82f6] ml-auto mt-2" />
      </div>
    </div>
  );
  return (
    <div className="h-24 rounded-lg overflow-hidden border border-gray-200 flex">
      {theme === "system" ? (
        <>
          <div className="w-1/2 overflow-hidden">{pane(false)}</div>
          <div className="w-1/2 overflow-hidden">{pane(true)}</div>
        </>
      ) : (
        <div className="w-full">{pane(theme === "dark")}</div>
      )}
    </div>
  );
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

/** Change the display name. */
function ProfileForm() {
  const { user, setUser } = useWorkspace();
  const { toast } = useFeedback();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const changed = name.trim() !== "" && name.trim() !== user.name;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    setSaving(true);
    try {
      setUser(await usersService.updateProfile(name.trim()));
      toast("Name updated");
    } catch (err: unknown) {
      toast(errorText(err, "Could not update your name."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <div className="flex-1">
        <FieldLabel label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required
            autoComplete="name" className={inputClass} />
        </FieldLabel>
      </div>
      <Button type="submit" loading={saving} disabled={!changed}>Save name</Button>
    </form>
  );
}

/** Change the password; other devices are signed out. */
function PasswordForm() {
  const { toast } = useFeedback();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirmNext) {
      setError("The new passwords do not match.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await usersService.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirmNext("");
      toast("Password changed. Other devices have been signed out.");
    } catch (err: unknown) {
      setError(errorText(err, "Could not change your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="grid sm:grid-cols-3 gap-3">
        <FieldLabel label="Current password">
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} required
            autoComplete="current-password" className={inputClass} />
        </FieldLabel>
        <FieldLabel label="New password">
          <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} maxLength={72}
            autoComplete="new-password" placeholder="At least 8 characters" className={inputClass} />
        </FieldLabel>
        <FieldLabel label="Confirm new password">
          <PasswordInput value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} required
            autoComplete="new-password" className={inputClass} />
        </FieldLabel>
      </div>
      <Button type="submit" loading={saving} icon="key">Change password</Button>
    </form>
  );
}

/** Permanently delete the account after confirming with the password. */
function DeleteAccount() {
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    const sure = await confirm({
      title: "Delete your account?",
      message: "Your account, your Personal workspace with all its files and chats, and groups only you are in will be deleted. Groups with other members pass to one of them. This cannot be undone.",
      confirmLabel: "Delete my account",
      danger: true,
    });
    if (!sure) return;
    setError("");
    setDeleting(true);
    try {
      await usersService.deleteAccount(password);
      setSignedIn(false);
      setActiveWorkspaceId(null);
      toast("Your account has been deleted.");
      router.push("/");
    } catch (err: unknown) {
      setError(errorText(err, "Could not delete your account."));
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={remove} className="flex flex-col sm:flex-row gap-3 sm:items-end">
      <div className="flex-1">
        <FieldLabel label="Enter your password to confirm">
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required
            autoComplete="current-password" className={inputClass} />
        </FieldLabel>
        {error && <p role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
      <Button type="submit" variant="danger" icon="trash" loading={deleting}>Delete account</Button>
    </form>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, workspace } = useWorkspace();
  const { toast } = useFeedback();
  // This page only renders in the browser, so localStorage is available here
  const [theme, setTheme] = useState<ThemePreference>(() => getThemePreference());

  const chooseTheme = (value: ThemePreference) => {
    setTheme(value);
    setThemePreference(value);
    toast(`Appearance set to ${THEMES.find((t) => t.value === value)?.label}`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="p-6">
        <CardHeader icon="sun" title="Appearance" description="Choose how Munven looks on this device." />
        <div role="radiogroup" aria-label="Theme" className="grid sm:grid-cols-3 gap-4">
          {THEMES.map((t) => {
            const selected = theme === t.value;
            return (
              <button
                key={t.value}
                role="radio"
                aria-checked={selected}
                // Name is just "Dark"; the description is read separately
                aria-labelledby={`theme-${t.value}-label`}
                aria-describedby={`theme-${t.value}-desc`}
                onClick={() => chooseTheme(t.value)}
                className={`text-left rounded-xl border-2 p-3 transition-colors ${
                  selected ? "border-blue-600 bg-blue-50/40" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <ThemePreview theme={t.value} />
                <div className="mt-3 flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selected ? "border-blue-600" : "border-gray-300"
                    }`}
                  >
                    {selected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                  </span>
                  <span className="min-w-0">
                    <span id={`theme-${t.value}-label`} className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      <Icon name={t.icon} className="w-4 h-4 text-gray-500" />
                      {t.label}
                    </span>
                    <span id={`theme-${t.value}-desc`} className="block text-xs text-gray-500 mt-0.5">{t.description}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader icon="users" title="Account" description="Your Munven profile." />
        <div className="flex items-center gap-4 flex-wrap">
          <Avatar name={user.name} />
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {user.is_admin && <Badge tone="blue">Company admin</Badge>}
            <Badge tone="gray">
              {workspace.is_personal ? "Personal workspace" : `${workspace.name} · ${workspace.role}`}
            </Badge>
          </div>
          <Button
            variant="secondary"
            icon="logout"
            className="ml-auto"
            onClick={() => {
              authService.logout();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
        <div className="mt-6 pt-6 border-t border-gray-100">
          <ProfileForm />
        </div>
      </Card>

      <Card className="p-6">
        <CardHeader icon="key" title="Password" description="Changing it signs you out on every other device." />
        <PasswordForm />
        {!user.is_public && (
          <p className="mt-4 text-xs text-gray-400">
            Forgot your password? A company admin can send you a reset link from the Company page.
          </p>
        )}
      </Card>

      <Card className="p-6 border-red-200">
        <CardHeader icon="trash" title="Delete account"
          description="Permanently remove your account and everything in your Personal workspace." />
        <DeleteAccount />
      </Card>
    </div>
  );
}
