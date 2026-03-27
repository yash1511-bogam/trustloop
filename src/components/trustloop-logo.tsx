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
  const bright = variant === "white" ? "#F5F5F8" : "#EDEDF0";
  const muted = variant === "white" ? "#F5F5F8" : "#333333";

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

  const height = size;
  const width = Math.round(size * 6.9);
  const trustY = size * 0.76;
  const loopY = size * 0.75;

  const strokeWidth = size <= 20 ? 1 : 1.2;

  return (
    <svg
      aria-label="TrustLoop"
      className={className}
      height={height}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <g transform={`scale(${size / 24})`}>
        <MarkGlyph color={bright} strokeWidth={strokeWidth} />
      </g>
      <text
        fill={bright}
        fontFamily="var(--font-display), serif"
        fontSize={size * 0.9}
        fontStyle="italic"
        fontWeight="400"
        x={size * 1.45}
        y={trustY}
      >
        Trust
      </text>
      <rect
        fill={muted}
        height={14}
        rx={0.5}
        width={1}
        x={size * 4.5}
        y={(size - 14) / 2}
      />
      <text
        fill={bright}
        fontFamily="var(--font-heading), sans-serif"
        fontSize={size * 0.76}
        fontWeight="800"
        letterSpacing="0.12em"
        style={{ textTransform: "uppercase" } as CSSProperties}
        x={size * 4.95}
        y={loopY}
      >
        LOOP
      </text>
    </svg>
  );
}
