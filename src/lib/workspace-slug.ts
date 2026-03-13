import { Prisma, PrismaClient, Workspace } from "@prisma/client";

const MAX_SLUG_LENGTH = 60;

type WorkspaceDbClient = PrismaClient | Prisma.TransactionClient;

export function slugBaseFromName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  const base = normalized.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  if (base.length >= 3) {
    return base;
  }
  return "workspace";
}

function buildSlugCandidate(base: string, attempt: number): string {
  if (attempt === 0) {
    return base;
  }

  const suffix = `-${attempt + 1}`;
  const trimmedBase = base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, "");
  return `${trimmedBase || "workspace"}${suffix}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createWorkspaceWithGeneratedSlug(
  db: WorkspaceDbClient,
  name: string,
): Promise<Workspace> {
  const base = slugBaseFromName(name);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const slug = buildSlugCandidate(base, attempt);

    try {
      return await db.workspace.create({
        data: {
          name,
          slug,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("workspace_slug_generation_failed");
}

export async function ensureWorkspaceSlug(
  db: WorkspaceDbClient,
  workspaceId: string,
  workspaceName?: string,
): Promise<string | null> {
  const existing = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      name: true,
      slug: true,
    },
  });

  if (!existing) {
    return null;
  }

  if (existing.slug) {
    return existing.slug;
  }

  const base = slugBaseFromName(workspaceName ?? existing.name);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = buildSlugCandidate(base, attempt);
    const conflict = await db.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (conflict) {
      continue;
    }

    const updated = await db.workspace.updateMany({
      where: {
        id: workspaceId,
        slug: null,
      },
      data: {
        slug: candidate,
      },
    });

    if (updated.count === 1) {
      return candidate;
    }

    const refreshed = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true },
    });

    if (refreshed?.slug) {
      return refreshed.slug;
    }
  }

  throw new Error("workspace_slug_generation_failed");
}
