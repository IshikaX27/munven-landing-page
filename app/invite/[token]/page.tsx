import { Suspense } from "react";
import InviteForm from "./InviteForm";

// The token comes from the URL, which is only known per request: Next.js needs the part that reads it
// inside <Suspense> (otherwise the production build fails to prerender this route)
export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <InviteForm />
    </Suspense>
  );
}
