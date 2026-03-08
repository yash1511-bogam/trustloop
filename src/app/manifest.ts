import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrustLoop",
    short_name: "TrustLoop",
    description: "AI incident operations SaaS for modern on-call teams.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eef4f6",
    theme_color: "#0b1220",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
