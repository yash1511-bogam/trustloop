import { ApiReference } from "@scalar/nextjs-api-reference";

export const GET = ApiReference({
  url: "/api/docs",
  pageTitle: "TrustLoop API Reference",
  theme: "deepSpace",
  darkMode: true,
  customCss: `
    body { background: #0b0c0e !important; }
    .scalar-app { --scalar-background-1: #0b0c0e !important; --scalar-background-2: #111214 !important; --scalar-background-3: #19191d !important; --scalar-border-color: #252529 !important; --scalar-color-1: #ededf0 !important; --scalar-color-2: #c8c8d0 !important; --scalar-color-3: #8c8c96 !important; --scalar-color-accent: #e8572a !important; }
  `,
});
