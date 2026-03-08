import type { CSSProperties, FC } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Stage = {
  title: string;
  detail: string;
  metric: string;
  accent: string;
  bullets: [string, string, string];
};

const STAGES: Stage[] = [
  {
    title: "1. Capture Every Signal",
    detail:
      "Incidents arrive from support tickets, Datadog, PagerDuty, Sentry, and API keys in one queue.",
    metric: "Unified intake in < 2 min",
    accent: "#a16207",
    bullets: [
      "Webhook and API-key ingestion",
      "Workspace-scoped authentication",
      "Severity + ticket context captured",
    ],
  },
  {
    title: "2. Run AI Triage",
    detail:
      "TrustLoop routes triage to OpenAI, Gemini, or Anthropic based on workflow settings and key health.",
    metric: "Suggested owner + next steps",
    accent: "#0f766e",
    bullets: [
      "Provider-per-workflow routing",
      "Timeline events recorded automatically",
      "Role-aware escalation support",
    ],
  },
  {
    title: "3. Communicate Fast",
    detail:
      "Teams approve customer-safe updates, trigger reminders, and send receipts/notifications from one console.",
    metric: "Customer update SLA maintained",
    accent: "#b45309",
    bullets: [
      "Status-page publishing",
      "Reminder + confirmation emails",
      "Failed-payment recovery automations",
    ],
  },
  {
    title: "4. Lead With Visibility",
    detail:
      "Executive charts, quotas, and trends stay current through read models and worker automations.",
    metric: "Reliable weekly ops reporting",
    accent: "#1d4ed8",
    bullets: [
      "Trend analytics for leadership",
      "Workspace plan + quota visibility",
      "Audit-ready history and exports",
    ],
  },
];

export type TrustLoopHowItWorksProps = {
  workspaceLabel: string;
};

export const trustLoopHowItWorksDefaults: TrustLoopHowItWorksProps = {
  workspaceLabel: "TrustLoop",
};

const SCENE_FRAMES = 95;

const cardBase: CSSProperties = {
  width: "100%",
  maxWidth: 980,
  borderRadius: 32,
  border: "1px solid rgba(255,255,255,0.34)",
  background: "linear-gradient(160deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
  boxShadow: "0 24px 60px rgba(28,25,23,0.18)",
  padding: "38px 42px",
  display: "flex",
  gap: 34,
};

const textSecondary: CSSProperties = {
  color: "#57534e",
  fontSize: 28,
  lineHeight: 1.4,
};

const monoBadge: CSSProperties = {
  fontSize: 20,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#78716c",
  fontWeight: 700,
};

const timelineWrap: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
  width: "100%",
  maxWidth: 920,
};

const sceneContainer: CSSProperties = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  display: "flex",
};

const bulletList: CSSProperties = {
  margin: "18px 0 0",
  padding: 0,
  listStyle: "none",
  display: "grid",
  gap: 10,
};

const checkMarkStyle: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 900,
  color: "#fefce8",
  marginTop: 3,
  flexShrink: 0,
};

const StagePanel: FC<{
  stage: Stage;
  workspaceLabel: string;
}> = ({ stage, workspaceLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 170,
      mass: 0.8,
    },
  });

  const cardOpacity = interpolate(frame, [0, 8, SCENE_FRAMES - 12, SCENE_FRAMES - 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0.1, 0.1, 1),
  });

  const cardY = interpolate(enter, [0, 1], [42, 0]);

  const lineProgress = interpolate(frame, [0, SCENE_FRAMES - 18], [0.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={sceneContainer}>
      <div
        style={{
          ...cardBase,
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`,
        }}
      >
        <div style={{ flex: 1.2 }}>
          <div style={monoBadge}>{workspaceLabel} workflow</div>
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: 54,
              lineHeight: 1.08,
              color: "#111827",
            }}
          >
            {stage.title}
          </h2>
          <p style={{ ...textSecondary, marginTop: 16 }}>{stage.detail}</p>

          <ul style={bulletList}>
            {stage.bullets.map((bullet, index) => {
              const bulletIn = interpolate(frame, [12 + index * 8, 30 + index * 8], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              return (
                <li
                  key={bullet}
                  style={{
                    opacity: bulletIn,
                    transform: `translateY(${interpolate(bulletIn, [0, 1], [12, 0])}px)`,
                    display: "flex",
                    gap: 10,
                    fontSize: 24,
                    color: "#292524",
                  }}
                >
                  <span style={{ ...checkMarkStyle, backgroundColor: stage.accent }}>✓</span>
                  <span>{bullet}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div
          style={{
            width: 320,
            borderRadius: 26,
            border: `1px solid ${stage.accent}55`,
            background: `linear-gradient(170deg, ${stage.accent}20, #ffffff)`,
            padding: 22,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.85)",
          }}
        >
          <p style={{ ...monoBadge, margin: 0 }}>Outcome</p>
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 36,
              fontWeight: 800,
              color: "#111827",
              lineHeight: 1.15,
            }}
          >
            {stage.metric}
          </p>
          <div
            style={{
              marginTop: 18,
              height: 10,
              borderRadius: 999,
              background: "rgba(41,37,36,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.round(lineProgress * 100)}%`,
                height: "100%",
                borderRadius: 999,
                background: stage.accent,
              }}
            />
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 19, color: "#57534e" }}>
            Step progress {Math.max(1, Math.round(lineProgress * 100))}%
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const TrustLoopHowItWorks: FC<TrustLoopHowItWorksProps> = ({ workspaceLabel }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const driftOne = interpolate(frame, [0, durationInFrames], [0, 200]);
  const driftTwo = interpolate(frame, [0, durationInFrames], [0, -130]);
  const sceneIndex = Math.min(STAGES.length - 1, Math.floor(frame / SCENE_FRAMES));

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(1200px 620px at -8% -8%, rgba(202,138,4,0.24), transparent 52%), radial-gradient(1000px 520px at 105% 6%, rgba(180,83,9,0.18), transparent 56%), linear-gradient(180deg, #fafaf9 0%, #f3f0ea 48%, #efeae2 100%)",
        fontFamily: "DM Sans, Inter, system-ui, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.66,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -120,
            top: -70,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(202,138,4,0.34), rgba(202,138,4,0))",
            filter: "blur(16px)",
            transform: `translateY(${driftOne}px)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -140,
            top: 90,
            width: 560,
            height: 560,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(20,184,166,0.2), rgba(20,184,166,0))",
            filter: "blur(20px)",
            transform: `translateY(${driftTwo}px)`,
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          padding: "34px 60px 46px",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ ...monoBadge, margin: 0 }}>TrustLoop Explainer</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 42, color: "#111827", lineHeight: 1.12 }}>
              How TrustLoop works in 12 seconds
            </h1>
          </div>
          <div
            style={{
              borderRadius: 999,
              border: "1px solid rgba(68,64,60,0.25)",
              padding: "8px 16px",
              background: "rgba(255,255,255,0.75)",
              fontSize: 20,
              color: "#57534e",
              fontWeight: 700,
            }}
          >
            Scene {sceneIndex + 1} / {STAGES.length}
          </div>
        </div>

        {STAGES.map((stage, index) => (
          <Sequence key={stage.title} from={index * SCENE_FRAMES} durationInFrames={SCENE_FRAMES}>
            <StagePanel stage={stage} workspaceLabel={workspaceLabel} />
          </Sequence>
        ))}

        <div style={timelineWrap}>
          {STAGES.map((stage, index) => {
            const start = index * SCENE_FRAMES;
            const progress = interpolate(frame, [start, start + SCENE_FRAMES - 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={stage.title}
                style={{
                  borderRadius: 999,
                  height: 10,
                  border: "1px solid rgba(68,64,60,0.24)",
                  background: "rgba(255,255,255,0.75)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.round(progress * 100)}%`,
                    height: "100%",
                    background: stage.accent,
                  }}
                />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
