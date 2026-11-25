"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authService } from "../../../services/auth";
import AuthLayout, { Field, FormError } from "../../components/AuthLayout";
import { Button, Icon, PasswordInput, Spinner, inputClass } from "../../components/ui";

/** Opened from the link a company admin shares: the employee sets a password and is signed in. */
export default function InviteForm() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [invitee, setInvitee] = useState<{ name: string; email: string } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authService
      .inviteInfo(token)
      .then((info) => !cancelled && setInvitee(info))
      .catch((err: Error) => !cancelled && setLinkError(err.message));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await authService.acceptInvite(token, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not set your password");
      setSaving(false);
    }
  };

  if (linkError) {
    return (
      <AuthLayout title="Link not valid" subtitle={linkError}>
        <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm flex gap-3">
          <span className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Icon name="alert" className="w-5 h-5" />
          </span>
          <p className="text-sm text-gray-600">Ask your company admin for a new invite link. Links work once and expire after 7 days.</p>
        </div>
        <Link href="/login" className="mt-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
          Go to sign in
          <Icon name="chevronRight" className="w-4 h-4" />
        </Link>
      </AuthLayout>
    );
  }

  if (!invitee) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 text-gray-500">
        <Spinner className="w-6 h-6 text-blue-600" />
        <p className="text-sm">Checking your invite...</p>
      </div>
    );
  }

  return (
    <AuthLayout
      title={<>Welcome to Munven, {invitee.name.split(" ")[0]}</>}
      subtitle={<>Set a password for <span className="font-medium text-gray-700">{invitee.email}</span> to finish setting up your account.</>}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormError message={error} />
        <Field label="New password">
          <PasswordInput required minLength={8} autoComplete="new-password" className={inputClass}
            placeholder="New password (at least 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <PasswordInput required autoComplete="new-password" className={inputClass}
            placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </Field>
        <Button type="submit" loading={saving} className="w-full">
          {saving ? "Setting up..." : "Set password & sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
