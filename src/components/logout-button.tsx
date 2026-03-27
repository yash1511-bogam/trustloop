"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleNotch, SignOut } from "@phosphor-icons/react";

export function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setLoading(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <button 
      className={compact ? "app-sidebar-toggle mx-auto" : "btn btn-ghost w-full justify-start"} 
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
