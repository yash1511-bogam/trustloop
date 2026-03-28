"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/dashboard?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  }

  if (!open) return null;

  return (
    <>
      <button
        aria-label="Close search"
        className="fixed inset-0 z-[90] bg-[var(--color-void)]/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        type="button"
      />
      <div className="fixed left-1/2 top-[20%] z-[91] w-full max-w-[520px] -translate-x-1/2 rounded-[var(--radius-lg)] border border-[var(--color-rim)] bg-[var(--color-surface)] p-2 shadow-2xl" role="dialog" aria-label="Quick search">
        <form className="flex items-center gap-2 px-3" onSubmit={handleSubmit}>
          <MagnifyingGlass className="shrink-0 text-[var(--color-ghost)]" size={18} weight="regular" />
          <input
            autoFocus
            className="flex-1 bg-transparent py-3 text-sm text-[var(--color-title)] placeholder:text-[var(--color-ghost)] outline-none"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents, settings, docs…"
            value={query}
          />
          <kbd className="hidden rounded border border-[var(--color-rim)] bg-[var(--color-void)] px-1.5 py-0.5 text-[10px] text-[var(--color-ghost)] sm:inline">esc</kbd>
        </form>
      </div>
    </>
  );
}
