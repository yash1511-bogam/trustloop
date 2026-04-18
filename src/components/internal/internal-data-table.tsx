"use client";

import { useState } from "react";

type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

export function InternalDataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page,
  limit,
  searchPlaceholder,
  onSearch,
  onPageChange,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  onPageChange?: (p: number) => void;
  onRowClick?: (row: T) => void;
}) {
  const [query, setQuery] = useState("");
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {onSearch && (
        <div className="mb-4">
          <input
            type="text"
            placeholder={searchPlaceholder ?? "Search..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch(query)}
            className="w-full max-w-sm rounded-md border border-[var(--color-rim)] bg-[#101113] px-3 py-2 text-sm text-[var(--color-body)] placeholder:text-[var(--color-ghost)] focus:border-[#d4622b] focus:outline-none"
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-rim)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-rim)] bg-[#101113]">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-2.5 text-left text-xs font-medium text-[var(--color-ghost)]">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[var(--color-ghost)]">No results</td></tr>
            )}
            {data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-[var(--color-rim)] ${onRowClick ? "cursor-pointer hover:bg-[#17181c]" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2.5 text-[var(--color-body)]">
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-ghost)]">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded border border-[var(--color-rim)] px-2 py-1 disabled:opacity-30">Prev</button>
            <span className="px-2 py-1">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded border border-[var(--color-rim)] px-2 py-1 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
