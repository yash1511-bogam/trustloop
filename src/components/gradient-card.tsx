"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  colors?: string;
  gradient?: string;
  heading?: string;
  description?: string;
  children?: ReactNode;
};

function TypingHeading({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [text]);
  return (
    <h2 className="font-[var(--font-heading)] text-[28px] font-extrabold leading-tight text-white">
      {displayed}
      <span className="animate-pulse">|</span>
    </h2>
  );
}

export function GradientCard({ colors, gradient, heading, description, children }: Props) {
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
      className={`auth-grain-heavy relative hidden lg:flex flex-col flex-1 my-8 ml-[120px] overflow-hidden rounded-2xl p-8 ${colors ?? ""}`}
      style={{
        backgroundSize: "400% 400%",
        animation: "gradient-flow 12s ease-in-out infinite",
        ...(gradient ? { backgroundImage: gradient } : {}),
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {(heading || description) && (
        <div className="relative z-[2] flex flex-1 items-center justify-center">
          <div className="max-w-[360px] text-center">
            {heading && <TypingHeading text={heading} />}
            {description && (
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">{description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
