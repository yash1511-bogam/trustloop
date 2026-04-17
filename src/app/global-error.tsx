"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h2>
            <button onClick={reset} style={{ padding: "8px 16px", cursor: "pointer" }}>Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}
