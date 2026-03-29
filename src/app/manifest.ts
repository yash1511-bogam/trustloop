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
        src: "/128.svg",
        sizes: "128x128",
        type: "image/svg+xml",
      },
      {
        src: "/256.svg",
        sizes: "256x256",
        type: "image/svg+xml",
      },
      {
        src: "/512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
