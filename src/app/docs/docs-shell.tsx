"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { House } from "@/components/icon-compat";
import { TrustLoopLogo } from "@/components/trustloop-logo";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { docsSource } from "@/lib/docs-source";

function subscribe(): () => void {
  return () => undefined;
}

export function DocsShell({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div className="min-h-screen px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-[var(--color-rim)] bg-[var(--color-surface)] px-5 py-4 backdrop-blur-sm">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-bright)]">
            <TrustLoopLogo size={14} variant="full" />
          </span>
          <Link className="text-sm text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href="/">
            Product Home
          </Link>
        </div>
      </div>
    );
  }

  return (
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
            <TrustLoopLogo size={14} variant="full" />
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
            <div className="rounded-[8px] border border-[var(--color-rim)] bg-[var(--color-surface)] p-3">
              <p className="text-xs font-medium text-fd-foreground">Need product access?</p>
              <Link className="mt-1 inline-flex text-xs text-[var(--color-signal)] underline underline-offset-4" href="/register">
                Launch a workspace →
              </Link>
            </div>
          ),
        }}
        themeSwitch={{ enabled: false }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
