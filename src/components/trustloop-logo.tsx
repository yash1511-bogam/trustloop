import type { CSSProperties } from "react";

type TrustLoopLogoProps = {
  size?: number;
  variant?: "full" | "mark" | "white";
  className?: string;
};

function MarkGlyph({
  color,
  strokeWidth,
}: {
  color: string;
  strokeWidth: number;
}) {
  return (
    <>
      <path
        d="M5.5 4.5H15.5L18.5 7.5V18.5H5.5Z"
        fill="none"
        stroke={color}
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M15.5 4.5V7.5H18.5"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
      <path
        d="M13.4 8.2C15.95 8.2 18 10.25 18 12.8C18 14.85 16.7 16.55 14.82 17.22"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
    </>
  );
}

export function TrustLoopLogo({
  size = 20,
  variant = "full",
  className,
}: TrustLoopLogoProps) {
  const bright = variant === "white" ? "#F4F5F9" : "#ECEDF1";
  const muted = variant === "white" ? "#F4F5F9" : "#333333";

  if (variant === "mark") {
    return (
      <svg
        aria-label="TrustLoop"
        className={className}
        height={size}
        role="img"
        viewBox="0 0 24 24"
        width={size}
      >
        <MarkGlyph color={bright} strokeWidth={size <= 20 ? 1 : 1.2} />
      </svg>
    );
  }

  const s = size / 24;
  const strokeWidth = size <= 20 ? 1 : 1.2;

  /* Fixed positions at base 24, then scaled via the outer transform.
     "Trust" in Instrument Serif italic ~40px wide at fontSize 21.6,
     "LOOP" in Syne 800 + 0.12em tracking ~46px wide at fontSize 18.24.
     Separator sits between them as a subtle vertical bar. */
  const trustX = 28;
  const trustFontSize = 21.6;
  const sepX = 72;
  const loopX = 79;
  const loopFontSize = 18.24;
  const baseline = 18;
  const totalW = 160;

  const height = size;
  const width = Math.ceil(totalW * s);

  return (
    <svg
      aria-label="TrustLoop"
      className={`trustloop-logo ${className ?? ""}`}
      height={height}
      role="img"
      style={{ overflow: "visible" }}
      viewBox={`0 0 ${totalW} 24`}
      width={width}
    >
      <MarkGlyph color={bright} strokeWidth={strokeWidth / s} />
      <text
        fill={bright}
        x={trustX}
        y={baseline}
        style={{
          fontFamily: "var(--font-display), serif",
          fontSize: trustFontSize,
          fontStyle: "italic",
          fontWeight: 400,
        } as CSSProperties}
      >
        Trust
      </text>
      <rect
        fill={muted}
        height={14}
        rx={0.5}
        width={1}
        x={sepX}
        y={5}
      />
      <text
        fill={bright}
        x={loopX}
        y={baseline}
        style={{
          fontFamily: "var(--font-heading), sans-serif",
          fontSize: loopFontSize,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        } as CSSProperties}
      >
        L<tspan stroke={bright} strokeWidth={1.2} paintOrder="stroke">∞</tspan>P
      </text>
    </svg>
  );
}
