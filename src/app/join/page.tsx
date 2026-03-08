import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    notFound();
  }

  const invite = await prisma.workspaceInvite.findFirst({
    where: {
      token,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      workspace: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invite) {
    return (
      <main className="container-shell py-10">
        <section className="surface p-6">
          <h1 className="text-2xl font-semibold">Invite link unavailable</h1>
          <p className="mt-2 text-sm text-slate-700">
            This invite is invalid, already used, or expired.
          </p>
          <Link className="btn btn-primary mt-4" href="/login">
            Go to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container-shell py-10">
      <section className="surface p-6">
        <p className="kicker">Workspace invite</p>
        <h1 className="mt-2 text-3xl font-semibold">Join {invite.workspace.name}</h1>
        <p className="mt-2 text-sm text-slate-700">
          You were invited as <strong>{invite.role}</strong> using{" "}
          <strong>{invite.email}</strong>.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Continue with OTP registration to accept the invite and join this workspace.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="btn btn-primary"
            href={`/register?invite=${encodeURIComponent(invite.token)}&email=${encodeURIComponent(invite.email)}`}
          >
            Accept invite
          </Link>
          <Link className="btn btn-ghost" href="/login">
            Already have access
          </Link>
        </div>
      </section>
    </main>
  );
}
