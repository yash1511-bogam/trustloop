import { requireInternalAuth } from "@/lib/internal-auth";
import { InternalShell } from "@/components/internal/internal-shell";

export const dynamic = "force-dynamic";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireInternalAuth();

  return (
    <InternalShell role={role} email={user.email}>
      {children}
    </InternalShell>
  );
}
