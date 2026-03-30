import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { TrustLoopLogo } from "@/components/trustloop-logo";

type Props = {
  kicker: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function PageShell({ kicker, title, subtitle, children }: Props) {
  return (
    <main className="legal-page">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/">
          <TrustLoopLogo size={18} variant="full" />
        </Link>
        <Link href="/" className="flex items-center gap-1.5 text-sm text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]">
          <ArrowLeft size={14} weight="bold" />
          Back
        </Link>
      </header>
      <p className="page-kicker">{kicker}</p>
      <h1 className="mt-3 font-[var(--font-heading)] text-[32px] font-bold text-[var(--color-title)]">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-[var(--color-ghost)]">{subtitle}</p>}
      <div className="mt-8">
        {children}
      </div>
      <footer className="mt-16 border-t border-[var(--color-rim)] pt-6 text-xs text-[var(--color-ghost)]">
        <p>&copy; {new Date().getFullYear()} TrustLoop, Inc. All rights reserved.</p>
        <div className="mt-2 flex flex-wrap gap-4">
          <Link className="hover:text-[var(--color-body)] transition-colors" href="/terms">Terms</Link>
          <Link className="hover:text-[var(--color-body)] transition-colors" href="/privacy">Privacy</Link>
          <Link className="hover:text-[var(--color-body)] transition-colors" href="/dpa">DPA</Link>
          <Link className="hover:text-[var(--color-body)] transition-colors" href="/billing-policy">Billing</Link>
        </div>
      </footer>
    </main>
  );
}
