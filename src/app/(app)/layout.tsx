import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuth();

  return (
    <main className="container-shell fade-in">
      <header className="surface mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="kicker">{auth.user.workspaceName}</p>
          <h1 className="text-xl font-semibold">TrustLoop Incident Workspace</h1>
        </div>

        <nav className="flex items-center gap-2">
          <Link className="btn btn-ghost" href="/dashboard">
            Dashboard
          </Link>
          <Link className="btn btn-ghost" href="/executive">
            Executive
          </Link>
          <Link className="btn btn-ghost" href="/settings">
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </header>

      {children}
    </main>
  );
}
