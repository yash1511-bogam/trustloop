"use client";

import { useState } from "react";
import { CircleNotch, SignOut } from "@phosphor-icons/react";

export function LogoutButton({ compact }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setLoading(false);
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
    const proto = rootDomain.startsWith("localhost") ? "http" : "https";
    window.location.href = `${proto}://${rootDomain}`;
  }

  return (
    <button 
      className={compact ? "app-sidebar-toggle mx-auto" : "btn w-full justify-start border-[rgba(232,66,66,0.18)] text-[var(--color-subtext)] hover:border-[rgba(232,66,66,0.3)] hover:bg-[rgba(232,66,66,0.06)] hover:text-[var(--color-danger)]"} 
      disabled={loading} 
      onClick={onLogout}
      type="button"
      title="Sign out"
    >
      {loading ? (
        <CircleNotch className="animate-spin" size={compact ? 18 : 16} />
      ) : (
        <SignOut size={compact ? 18 : 16} />
      )}
      {!compact && (loading ? "Signing out..." : "Sign out")}
    </button>
  );
}
