"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StatusAutoRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    function msUntilMidnight() {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return midnight.getTime() - now.getTime();
    }

    let timer = setTimeout(function tick() {
      router.refresh();
      timer = setTimeout(tick, msUntilMidnight());
    }, msUntilMidnight());

    return () => clearTimeout(timer);
  }, [router]);

  return <>{children}</>;
}
