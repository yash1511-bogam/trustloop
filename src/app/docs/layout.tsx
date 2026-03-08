import "fumadocs-ui/style.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenText, House } from "lucide-react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { docsSource } from "@/lib/docs-source";

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark">
      <RootProvider
        search={{
          enabled: true,
          options: {
            api: "/api/search",
          },
        }}
        theme={{ enabled: false }}
      >
        <DocsLayout
          tree={docsSource.getPageTree()}
          nav={{
            title: (
              <span className="inline-flex items-center gap-2 font-semibold">
                <BookOpenText className="h-4 w-4" />
                TrustLoop Docs
              </span>
            ),
            url: "/docs",
          }}
          links={[
            {
              type: "main",
              text: "Product Home",
              url: "/",
              icon: <House className="h-4 w-4" />,
              on: "menu",
            },
          ]}
          searchToggle={{ enabled: true }}
          sidebar={{
            enabled: true,
            collapsible: true,
            defaultOpenLevel: 1,
            footer: (
              <div className="text-xs text-fd-muted-foreground">
                <p className="mb-1 font-medium text-fd-foreground">Need product access?</p>
                <Link className="underline underline-offset-4" href="/register">
                  Launch a workspace
                </Link>
              </div>
            ),
          }}
          themeSwitch={{ enabled: false }}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </div>
  );
}
