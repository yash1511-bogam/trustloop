"use client";

import { useState } from "react";

export function InternalConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmTypeName,
  destructive,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  confirmTypeName?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const [typed, setTyped] = useState("");
  const needsType = !!confirmTypeName;
  const canConfirm = !needsType || typed === confirmTypeName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-rim)] bg-[#101113] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-title)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--color-ghost)]">{description}</p>
        {children}
        {needsType && (
          <div className="mt-4">
            <p className="text-xs text-[var(--color-ghost)]">Type <strong className="text-[var(--color-body)]">{confirmTypeName}</strong> to confirm:</p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-rim)] bg-[#0a0b0d] px-3 py-2 text-sm text-[var(--color-body)] focus:border-[#d4622b] focus:outline-none"
            />
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-md border border-[var(--color-rim)] px-4 py-2 text-sm text-[var(--color-ghost)] hover:bg-[#17181c]">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-30 ${
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-[#d4622b] hover:bg-[#be5524]"
            }`}
          >
            {confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
