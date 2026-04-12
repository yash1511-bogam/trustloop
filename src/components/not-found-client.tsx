"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const INFINITY_PATH = "M15.5871 31.2775C10.7699 31.2775 6.95054 30.0732 4.12903 27.6646C1.37634 25.1871 0 21.8151 0 17.5484C0 14.1764 0.860216 11.2172 2.58065 8.67101C4.30108 6.05596 6.64086 4.02585 9.6 2.58069C12.628 1.13553 16 0.412945 19.7161 0.412945C23.2258 0.412945 26.8387 1.10112 30.5548 2.47746C34.3398 3.85381 38.9161 6.26241 44.2839 9.70327L40.3613 11.7678C36.3011 9.15273 32.6538 7.29467 29.4194 6.19359C26.2538 5.0237 23.157 4.43875 20.129 4.43875C16.4817 4.43875 13.5226 5.09252 11.2516 6.40004C9.04946 7.63875 7.94839 9.29036 7.94839 11.3549C7.94839 12.9377 8.67097 14.1764 10.1161 15.071C11.5613 15.8968 13.557 16.3097 16.1032 16.3097C19.0624 16.3097 22.2624 15.7592 25.7032 14.6581C29.1441 13.557 32.7226 12.2151 36.4387 10.6323C40.1548 8.98069 43.9398 7.36348 47.7935 5.78069C51.6473 4.12908 55.4323 2.75273 59.1484 1.65166C62.9333 0.55058 66.6151 0 70.1936 0C75.0108 0 78.7957 1.20434 81.5484 3.61295C84.3011 6.02155 85.6774 9.35918 85.6774 13.6259C85.6774 16.9979 84.8172 19.9914 83.0968 22.6065C81.3763 25.1527 79.0366 27.1828 76.0774 28.6968C73.1871 30.142 69.8495 30.8646 66.0645 30.8646C63.6559 30.8646 61.2129 30.5549 58.7355 29.9355C56.3269 29.3162 53.7118 28.3527 50.8903 27.0452C48.1376 25.6689 44.972 23.8452 41.3935 21.5742L45.1097 19.4065C47.6559 21.1269 50.0989 22.5377 52.4387 23.6388C54.8473 24.7398 57.1527 25.5656 59.3548 26.1162C61.6258 26.5979 63.7591 26.8388 65.7548 26.8388C69.1957 26.8388 72.0516 26.185 74.3226 24.8775C76.5935 23.5011 77.729 21.8151 77.729 19.8194C77.729 18.1678 77.0065 16.9635 75.5613 16.2065C74.1161 15.3807 72.086 14.9678 69.471 14.9678C66.3742 14.9678 63.071 15.5183 59.5613 16.6194C56.1204 17.7205 52.5419 19.0968 48.8258 20.7484C45.1785 22.3312 41.4624 23.9484 37.6774 25.6C33.9613 27.1828 30.2452 28.5248 26.529 29.6258C22.8129 30.7269 19.1656 31.2775 15.5871 31.2775Z";

const COLORS = [
  "#d4622b", // signal
  "#e8944a", // signal-light
  "#232428", // rim
  "#38393f", // muted
  "#5a5b63", // ghost
  "#8a8b95", // subtext
  "#d4622b",
  "#c6c7d0", // body
];

export default function NotFoundClient() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();

    const basePath = new Path2D(INFINITY_PATH);
    let prevX = 0;
    let prevY = 0;
    let colorIdx = 0;
    let lastStamp = 0;

    const stamp = (x: number, y: number) => {
      const now = Date.now();
      if (now - lastStamp < 60) return; // throttle
      lastStamp = now;

      const scale = 0.3 + Math.random() * 0.7;
      const rotation = Math.random() * Math.PI * 2;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      // center the 86x32 path
      ctx.translate(-43, -16);

      // alternate: filled color or dark silhouette
      if (colorIdx % 3 === 0) {
        ctx.fillStyle = "#0a0b0d";
      } else {
        ctx.fillStyle = COLORS[colorIdx % COLORS.length];
      }
      ctx.fill(basePath);
      ctx.restore();

      colorIdx++;
      prevX = x;
      prevY = y;
    };

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      if (Math.abs(dx) + Math.abs(dy) > 10) {
        stamp(e.clientX, e.clientY);
      }
    };

    // Touch support
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - prevX;
      const dy = t.clientY - prevY;
      if (Math.abs(dx) + Math.abs(dy) > 10) {
        stamp(t.clientX, t.clientY);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <main style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "var(--color-void)", display: "grid", placeContent: "center" }}>

      {/* Canvas for infinity stamp trail */}
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />

      {/* 404 text */}
      <h1
        style={{
          position: "relative",
          zIndex: 2,
          fontFamily: "var(--font-display), serif",
          fontStyle: "italic",
          fontSize: "min(40vw, 500px)",
          fontWeight: 400,
          color: "#fff",
          lineHeight: 1,
          margin: 0,
          padding: 0,
          pointerEvents: "none",
          letterSpacing: "-0.04em",
          userSelect: "none",
        }}
      >
        404
      </h1>

      {/* Bottom CTA */}
      <section style={{ position: "absolute", inset: 0, zIndex: 3, display: "grid", placeContent: "center", pointerEvents: "none" }}>
        <div style={{ marginTop: "min(55vh, 400px)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => router.push("/")}
            className="nf-btn-slide"
            style={{
              pointerEvents: "all",
              display: "inline-block",
              padding: "16px 48px",
              fontFamily: "var(--font-display), serif",
              fontStyle: "italic",
              fontSize: 20,
              background: "var(--color-signal)",
              color: "#fff",
              border: "none",
              borderRadius: 9999,
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
            type="button"
          >
            Close the loop — back to safety ∞
          </button>
          <button
            onClick={() => router.back()}
            style={{
              pointerEvents: "all",
              background: "none",
              border: "none",
              fontFamily: "var(--font-ui), sans-serif",
              fontSize: 13,
              color: "var(--color-ghost)",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
            type="button"
          >
            or go back
          </button>
        </div>
      </section>
    </main>
  );
}
