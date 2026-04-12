"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  GithubLogo,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react";
import { TrustLoopLogo } from "@/components/trustloop-logo";

const Footer3DLogo = dynamic(() => import("@/components/footer-3d-logo").then((m) => ({ default: m.Footer3DLogo })), { ssr: false });

export function MarketingFooter() {
  return (
    <>
      <footer className="relative z-10 px-6 pb-10 pt-12 md:px-8">
        <div className="mx-auto max-w-[960px] border-t border-[var(--color-rim)] pt-10">
          <div className="grid gap-y-8 gap-x-16 justify-items-center text-center sm:justify-items-start sm:text-left sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
            <div>
              <TrustLoopLogo size={16} variant="full" />
              <p className="mt-3 max-w-[200px] text-[13px] leading-relaxed text-[var(--color-ghost)]">AI incident operations for teams that ship.</p>
              <div className="mt-5 flex items-center justify-center sm:justify-start gap-4">
                <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]" href="https://x.com" rel="noreferrer" target="_blank"><XLogo size={16} weight="regular" /></a>
                <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]" href="https://github.com" rel="noreferrer" target="_blank"><GithubLogo size={16} weight="regular" /></a>
                <a className="text-[var(--color-ghost)] transition-colors hover:text-[var(--color-body)]" href="https://linkedin.com" rel="noreferrer" target="_blank"><LinkedinLogo size={16} weight="regular" /></a>
              </div>
              <p className="mt-4 text-[12px] text-[var(--color-ghost)]">© {new Date().getFullYear()} TrustLoop, Inc.</p>
            </div>

            <div className="hidden lg:flex items-center justify-center" style={{ margin: "0 -40px" }}>
              <Footer3DLogo />
            </div>

            <div className="grid content-start gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ghost)]">Product</p>
              {[["Changelog", "/changelog"], ["Pricing", "#pricing"], ["Docs", "/docs"], ["Status", "/status"]].map(([label, href]) => (
                label === "Docs" ? (
                  <a className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label} target="_blank" rel="noreferrer">{label}</a>
                ) : label === "Pricing" ? (
                  <button className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)] text-left" key={label} onClick={() => { document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }} type="button">{label}</button>
                ) : (
                  <Link className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label}>{label}</Link>
                )
              ))}
            </div>

            <div className="grid content-start gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ghost)]">Company</p>
              {[["Blog", "/blog"], ["About", "/about"], ["Security", "/security"]].map(([label, href]) => (
                <Link className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label}>{label}</Link>
              ))}
            </div>

            <div className="grid content-start gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ghost)]">Legal</p>
              {[["Terms", "/terms"], ["Privacy", "/privacy"], ["DPA", "/dpa"], ["Billing", "/billing-policy"]].map(([label, href]) => (
                <Link className="text-[13px] text-[var(--color-subtext)] transition-colors hover:text-[var(--color-bright)]" href={href} key={label}>{label}</Link>
              ))}
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}
