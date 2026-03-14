"use client";

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
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
        Workspace
      </span>
      <select
        className="select !py-2 text-sm"
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
    </label>
  );
}
