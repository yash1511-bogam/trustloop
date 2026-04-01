"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function DesktopOAuthCallbackInner() {
  const params = useSearchParams();
  const key = params.get("key");
  const error = params.get("error");

  if (error || !key) {
    return (
      <main style={styles.shell}>
        <div style={styles.card}>
          <h1 style={styles.title}>Authentication Failed</h1>
          <p style={styles.sub}>{error || "Invalid authentication session."}</p>
          <p style={styles.hint}>Close this tab and try again from the TrustLoop desktop app.</p>
        </div>
      </main>
    );
  }

  const deepLink = `trustloop://oauth/callback?key=${encodeURIComponent(key)}`;

  return (
    <main style={styles.shell}>
      <div style={styles.card}>
        <div style={styles.icon}>✓</div>
        <h1 style={styles.title}>Authentication Successful</h1>
        <p style={styles.sub}>Click below to return to the TrustLoop desktop app.</p>
        <a href={deepLink} style={styles.btn}>Open TrustLoop</a>
        <p style={styles.hint}>If nothing happens, make sure TrustLoop Desktop is running.</p>
      </div>
    </main>
  );
}

export default function DesktopOAuthCallbackPage() {
  return (
    <Suspense>
      <DesktopOAuthCallbackInner />
    </Suspense>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0b0d",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
  },
  card: { textAlign: "center", maxWidth: 400, padding: 40 },
  icon: {
    width: 48, height: 48, borderRadius: "50%",
    background: "rgba(22,163,74,0.12)", color: "#16a34a",
    fontSize: 24, display: "flex", alignItems: "center",
    justifyContent: "center", margin: "0 auto 20px",
  },
  title: { fontSize: 22, fontWeight: 700, color: "#ecedf1", marginBottom: 8 },
  sub: { fontSize: 14, color: "#8a8b95", marginBottom: 24 },
  btn: {
    display: "inline-block", padding: "12px 32px",
    background: "#d4622b", color: "#f4f5f9", borderRadius: 10,
    fontSize: 15, fontWeight: 600, textDecoration: "none",
  },
  hint: { marginTop: 16, fontSize: 12, color: "#5a5b63" },
};
