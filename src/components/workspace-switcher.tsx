"use client";

import { CaretDown } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Role } from "@prisma/client";
import { workspaceUrl } from "@/lib/workspace-url";

type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
  slug: string | null;
};

type WorkspaceSwitcherProps = {
  currentWorkspaceId: string;
  workspaces: WorkspaceOption[];
};

export function WorkspaceSwitcher({
  currentWorkspaceId,
  workspaces,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(currentWorkspaceId);
  const [loading, setLoading] = useState(false);

  async function switchWorkspace(nextWorkspaceId: string) {
    if (!nextWorkspaceId || nextWorkspaceId === currentWorkspaceId) {
      return;
    }

    setLoading(true);
    const response = await fetch("/api/workspace/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: nextWorkspaceId }),
    });
    setLoading(false);

    if (!response.ok) {
      setSelectedWorkspaceId(currentWorkspaceId);
      return;
    }

    const target = workspaces.find((w) => w.id === nextWorkspaceId);
    if (target?.slug) {
      window.location.assign(
        workspaceUrl("/dashboard", target.slug, target.role as Role),
      );
    } else {
      router.refresh();
      router.push("/dashboard");
    }
  }

  if (workspaces.length <= 1) {
    return null;
  }

  return (
    <div className="relative">
      <select
        aria-label="Switch workspace"
        className="select pr-9 text-sm"
        disabled={loading}
        value={selectedWorkspaceId}
        onChange={(event) => {
          const nextValue = event.target.value;
          setSelectedWorkspaceId(nextValue);
          void switchWorkspace(nextValue);
        }}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name} ({workspace.role})
          </option>
        ))}
      </select>
      <CaretDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        color="var(--color-ghost)"
        size={14}
      />
    </div>
  );
}
