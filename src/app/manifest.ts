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
        src: "/128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/256.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
