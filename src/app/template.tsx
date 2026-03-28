"use client";

/**
 * Page transitions removed per animation decision framework:
 * route changes happen tens of times per session — animation
 * at this frequency makes the app feel slower, not smoother.
 * A simple CSS opacity fade via @starting-style handles the
 * rare first-paint without penalising repeat navigation.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="section-enter">{children}</div>;
}
