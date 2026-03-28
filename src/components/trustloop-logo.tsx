"use client";

import Image from "next/image";

type TrustLoopLogoProps = {
  size?: number;
  variant?: "full" | "mark" | "white";
  color?: "white" | "black";
  className?: string;
};

const letters = [
  { src: "/Logo/T.svg", alt: "T", w: 60, h: 83 },
  { src: "/Logo/r.svg", alt: "r", w: 60, h: 60 },
  { src: "/Logo/u.svg", alt: "u", w: 60, h: 60 },
  { src: "/Logo/s.svg", alt: "s", w: 60, h: 60 },
  { src: "/Logo/2nd-t.svg", alt: "t", w: 72, h: 83 },
  { src: "/Logo/L.svg", alt: "L", w: 60, h: 83, ml: 0.3 },
  { src: "/Logo/%E2%88%9E.svg", alt: "∞", w: 106, h: 62 },
  { src: "/Logo/p.svg", alt: "p", w: 60, h: 82 },
];

export function TrustLoopLogo({
  size = 20,
  variant = "full",
  color = "white",
  className,
}: TrustLoopLogoProps) {
  const invert = color === "black" ? "invert(1)" : undefined;

  if (variant === "mark") {
    return (
      <div className={className} style={{ display: "flex", alignItems: "center" }}>
        <Image src="/Logo/T.svg" alt="TrustLoop" width={size} height={size} style={{ filter: invert }} draggable={false} />
      </div>
    );
  }

  const scale = size / 83;
  const gap = Math.round(size * 0.06);

  return (
    <div
      aria-label="TrustLoop"
      role="img"
      className={className}
      style={{ display: "flex", alignItems: "flex-end", gap }}
    >
      {letters.map((l, i) => (
        <Image
          key={`${l.alt}-${i}`}
          src={l.src}
          alt={l.alt}
          width={Math.round(l.w * scale)}
          height={Math.round(l.h * scale)}
          style={{ display: "block", filter: invert, height: "auto", marginLeft: l.ml ? Math.round(l.ml * size) : undefined }}
          draggable={false}
        />
      ))}
    </div>
  );
}
