"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";

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
      className={compact ? "menu-toggle mx-auto" : "btn btn-ghost"} 
      disabled={loading} 
      onClick={onLogout}
      title="Sign out"
    >
      {loading ? (
        <Loader2 className={`${compact ? 'h-5 w-5' : 'h-4 w-4 mr-2'} animate-spin`} />
      ) : (
        <LogOut className={compact ? "h-5 w-5" : "h-4 w-4 mr-2"} />
      )}
      {!compact && (loading ? "Signing out..." : "Sign out")}
    </button>
  );
}
