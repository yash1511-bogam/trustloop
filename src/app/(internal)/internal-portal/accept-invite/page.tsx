"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(!searchParams.get("token") ? "error" : "idle");
  const [errorMsg, setErrorMsg] = useState("");

  const accept = async () => {
    setStatus("loading");
    const r = await fetch("/api/internal-portal/team/accept-invite", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
    });
    if (r.ok) { setStatus("success"); setTimeout(() => router.push("/internal-portal"), 1500); }
    else { setStatus("error"); setErrorMsg("Invalid or expired invite. Make sure you're logged in with the correct email."); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0b0d]">
      <div className="w-full max-w-sm rounded-lg border border-[var(--color-rim)] bg-[#101113] p-8 text-center">
        <h1 className="text-lg font-bold text-[var(--color-title)]">TrustLoop Internal Portal</h1>
        {status === "idle" && (
          <>
            <p className="mt-4 text-sm text-[var(--color-ghost)]">You&apos;ve been invited to join the internal team.</p>
            <button onClick={accept} className="mt-6 w-full rounded-md bg-[#d4622b] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#be5524]">Accept Invite</button>
          </>
        )}
        {status === "loading" && <p className="mt-4 text-sm text-[var(--color-ghost)]">Accepting...</p>}
        {status === "success" && <p className="mt-4 text-sm text-green-400">Welcome! Redirecting...</p>}
        {status === "error" && <p className="mt-4 text-sm text-red-400">{errorMsg || "Invalid invite link."}</p>}
      </div>
    </div>
  );
}
