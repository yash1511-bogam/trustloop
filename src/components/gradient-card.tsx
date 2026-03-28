"use client";

import { useCallback, useRef, type ReactNode } from "react";

type Props = {
  colors?: string;
  gradient?: string;
  children?: ReactNode;
};

export function GradientCard({ colors, gradient, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.backgroundPosition = `${x}% ${y}%`;
    el.style.animationPlayState = "paused";
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animationPlayState = "running";
  }, []);

  return (
    <div
      ref={ref}
      className={`auth-grain-heavy relative hidden lg:flex flex-col my-8 ml-[120px] overflow-hidden rounded-2xl p-8 ${colors ?? ""}`}
      style={{
        backgroundSize: "400% 400%",
        animation: "gradient-flow 12s ease-in-out infinite",
        ...(gradient ? { backgroundImage: gradient } : {}),
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
