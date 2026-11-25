"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "../../services/auth";
import Link from "next/link";
import RedirectIfLoggedIn from "../components/RedirectIfLoggedIn";
import AuthLayout, { Field, FormError } from "../components/AuthLayout";
import { Button, PasswordInput, inputClass } from "../components/ui";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.login({ email, password });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login");
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in to your account" subtitle="Welcome back. Enter your work email and password.">
      <RedirectIfLoggedIn />
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormError message={error} />
        <Field label="Email">
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            id="password"
            name="password"
           
            autoComplete="current-password"
            required
            className={inputClass}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-sm text-center text-gray-500">
          New here? Ask your company admin for an invite link.{" "}
          <Link href="/register" className="text-blue-600 hover:underline font-medium">Register</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
