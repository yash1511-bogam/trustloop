import { describe, it, expect, vi } from "vitest";
import { deleteWorkspaceAndRehomeUsers } from "@/lib/workspace-admin";

const mockExecutor = {
  workspaceMembership: {
    findMany: vi.fn(async () => [{ userId: "u-1" }, { userId: "u-2" }]),
  },
  user: {
    findUnique: vi.fn(),
    delete: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
  },
  workspace: { delete: vi.fn(async () => ({})) },
};

describe("deleteWorkspaceAndRehomeUsers", () => {
  it("deletes users with no other workspace", async () => {
    mockExecutor.user.findUnique
      .mockResolvedValueOnce({ id: "u-1", workspaceId: "ws-1" })
      .mockResolvedValueOnce({ id: "u-2", workspaceId: "ws-1" });
    mockExecutor.workspaceMembership.findMany.mockResolvedValueOnce([{ userId: "u-1" }, { userId: "u-2" }]);

    // No other memberships for either user
    const findFirst = vi.fn(async () => null);
    const executor = { ...mockExecutor, workspaceMembership: { ...mockExecutor.workspaceMembership, findFirst } };

    const result = await deleteWorkspaceAndRehomeUsers(executor as never, "ws-1");
    expect(result.deletedWorkspaceId).toBe("ws-1");
    expect(result.deletedUserIds).toContain("u-1");
    expect(result.deletedUserIds).toContain("u-2");
  });

  it("rehomes users with another workspace", async () => {
    mockExecutor.user.findUnique.mockResolvedValueOnce({ id: "u-1", workspaceId: "ws-1" });
    mockExecutor.workspaceMembership.findMany.mockResolvedValueOnce([{ userId: "u-1" }]);

    const findFirst = vi.fn(async () => ({ workspaceId: "ws-2", role: "MEMBER" }));
    const executor = { ...mockExecutor, workspaceMembership: { ...mockExecutor.workspaceMembership, findFirst } };

    const result = await deleteWorkspaceAndRehomeUsers(executor as never, "ws-1");
    expect(result.rehomedUserIds).toContain("u-1");
    expect(result.deletedUserIds).toHaveLength(0);
  });
});
