import "fumadocs-ui/style.css";
import "./docs-theme.css";
import type { ReactNode } from "react";
import { DocsShell } from "@/app/docs/docs-shell";

export const dynamic = "force-dynamic";

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="docs-theme">
      <DocsShell>{children}</DocsShell>
    </div>
  );
}
