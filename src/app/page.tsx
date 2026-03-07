import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default async function LandingPage() {
  const auth = await getAuth();
  if (auth) {
    redirect("/dashboard");
  }

  return (
    <main className="container-shell fade-in">
      <div className="surface p-8 md:p-12">
        <p className="kicker mb-3">TrustLoop</p>
        <h1 className="mb-4 text-4xl font-bold leading-tight md:text-5xl">
          AI incident operations for software teams that ship customer-facing AI.
        </h1>
        <p className="mb-8 max-w-3xl text-lg text-slate-700">
          Stop managing hallucination escalations across scattered tickets, chats,
          and docs. TrustLoop gives your support and product teams one workflow to
          triage incidents, assign owners, and publish consistent customer updates.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn-primary" href="/register">
            Start workspace
          </Link>
          <Link className="btn btn-ghost" href="/login">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
