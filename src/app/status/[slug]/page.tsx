import { IncidentStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function statusTone(status: IncidentStatus): string {
  if (status === IncidentStatus.RESOLVED) {
    return "badge";
  }
  if (status === IncidentStatus.MITIGATED) {
    return "badge badge-p3";
  }
  if (status === IncidentStatus.INVESTIGATING) {
    return "badge badge-p2";
  }
  return "badge badge-p1";
}

export default async function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug,
      statusPageEnabled: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    notFound();
  }

  const [openIncidents, updates] = await Promise.all([
    prisma.incident.findMany({
      where: {
        workspaceId: workspace.id,
        status: { not: IncidentStatus.RESOLVED },
      },
      select: {
        id: true,
        title: true,
        status: true,
        severity: true,
        updatedAt: true,
      },
      orderBy: [{ severity: "asc" }, { updatedAt: "desc" }],
      take: 20,
    }),
    prisma.statusUpdate.findMany({
      where: {
        workspaceId: workspace.id,
        isVisible: true,
      },
      include: {
        incident: {
          select: {
            title: true,
            severity: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 80,
    }),
  ]);

  return (
    <main className="container-shell fade-in py-8">
      <section className="surface p-5">
        <p className="kicker">Public status</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{workspace.name}</h1>
        <p className="mt-2 text-sm text-slate-700">Customer-facing incident communication stream.</p>
      </section>

      <section className="surface mt-4 p-5">
        <h2 className="text-xl font-semibold">Current incidents</h2>
        <div className="mt-3 space-y-2">
          {openIncidents.map((incident) => (
            <article className="panel-card p-3" key={incident.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge">{incident.severity}</span>
                <span className={statusTone(incident.status)}>{incident.status}</span>
              </div>
              <p className="mt-2 font-semibold">{incident.title}</p>
              <p className="text-xs text-slate-500">Updated {incident.updatedAt.toLocaleString()}</p>
            </article>
          ))}

          {openIncidents.length === 0 ? <p className="text-sm text-slate-600">No active incidents.</p> : null}
        </div>
      </section>

      <section className="surface mt-4 p-5">
        <h2 className="text-xl font-semibold">Published updates</h2>
        <div className="mt-3 space-y-3">
          {updates.map((update) => (
            <article className="panel-card p-3" key={update.id}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="badge">{update.incident.severity}</span>
                <span>{update.incident.title}</span>
                <span>•</span>
                <time>{update.publishedAt.toLocaleString()}</time>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{update.body}</p>
            </article>
          ))}

          {updates.length === 0 ? (
            <p className="text-sm text-slate-600">No public updates published yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
