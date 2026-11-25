"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSignedIn } from "../../services/api";

// The signed-in hint lives in localStorage, so this check has to run in the browser
export default function RedirectIfLoggedIn({ to = "/dashboard" }: { to?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (isSignedIn()) router.replace(to);
  }, [router, to]);
  return null;
}
