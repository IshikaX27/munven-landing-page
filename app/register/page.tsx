"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../../services/auth";
import Link from "next/link";
import RedirectIfLoggedIn from "../components/RedirectIfLoggedIn";
import AuthLayout, { Field, FormError } from "../components/AuthLayout";
import { Button, Icon, PasswordInput, Spinner, inputClass } from "../components/ui";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Open sign-up: anyone gets a private research space. The very first account becomes the company admin.
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const [firstAccount, setFirstAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authService
      .registrationOpen()
      .then((status) => {
        if (cancelled) return;
        setFirstAccount(status.first_account);
        setRegistrationOpen(status.open);
      })
      .catch(() => !cancelled && setRegistrationOpen(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.register({ name, email, password });
      await authService.login({ email, password });
      router.push("/dashboard");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to register";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (registrationOpen === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600">
        <RedirectIfLoggedIn />
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (registrationOpen === false) {
    return (
      <AuthLayout title="Munven is invite-only" subtitle="Accounts are created by your company admin.">
        <RedirectIfLoggedIn />
        <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex gap-3">
            <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Icon name="key" className="w-5 h-5" />
            </span>
            <p className="text-sm text-gray-600">
              Ask your company admin to add you. You will get an invite link to set your password and sign in.
            </p>
          </div>
        </div>
        <Link href="/login" className="mt-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
          Already have an account? Sign in
          <Icon name="chevronRight" className="w-4 h-4" />
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={firstAccount ? "Set up Munven" : "Create your account"}
      subtitle={
        firstAccount
          ? "Create the first account. It becomes the company admin who invites everyone else."
          : "Free and open to everyone. Upload your documents and research them with AI in your own private space."
      }
    >
      <RedirectIfLoggedIn />
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormError message={error} />
        <Field label="Full name">
          <input name="name" type="text" required autoComplete="name" className={inputClass}
            placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={firstAccount ? "Work email" : "Email"}>
          <input name="email" type="email" required autoComplete="email" className={inputClass}
            placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <PasswordInput name="password" required minLength={8} autoComplete="new-password" className={inputClass}
            placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <PasswordInput name="confirmPassword" required autoComplete="new-password" className={inputClass}
            placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Creating account..." : "Register"}
        </Button>
        <p className="text-sm text-center text-gray-500">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
