"use client";

import { Role } from "@prisma/client";
import { useState } from "react";

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
};

type Invite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  createdAt: string;
  expiresAt: string;
};

type Props = {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
  canManageRoles: boolean;
};

export function TeamManagementPanel({
  members: initialMembers,
  invites: initialInvites,
  currentUserId,
  canManageRoles,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>(Role.AGENT);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [memberResponse, inviteResponse] = await Promise.all([
      fetch("/api/workspace/members"),
      fetch("/api/workspace/invites"),
    ]);
    if (memberResponse.ok) {
      const payload = (await memberResponse.json()) as { members: Member[] };
      setMembers(payload.members);
    }
    if (inviteResponse.ok) {
      const payload = (await inviteResponse.json()) as { invites: Invite[] };
      setInvites(payload.invites);
    }
  }

  async function createInvite() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/workspace/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to create invite.");
      return;
    }

    setInviteEmail("");
    setMessage("Invite created and email sent.");
    await refresh();
  }

  async function updateRole(userId: string, role: Role) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/workspace/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to update role.");
      return;
    }

    setMessage("Role updated.");
    await refresh();
  }

  async function removeMember(userId: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/workspace/members/${userId}`, {
      method: "DELETE",
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to remove member.");
      return;
    }

    setMessage("Member removed.");
    await refresh();
  }

  async function revokeInvite(inviteId: string) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/workspace/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inviteId }),
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to revoke invite.");
      return;
    }

    setMessage("Invite revoked.");
    await refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <input
          className="input"
          placeholder="teammate@company.com"
          type="email"
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
        />
        <select
          className="select"
          value={inviteRole}
          onChange={(event) => setInviteRole(event.target.value as Role)}
        >
          {Object.values(Role).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={loading} onClick={createInvite} type="button">
          Send invite
        </button>
      </div>

      <div>
        <p className="kicker mb-2">Members</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr className="border-t border-slate-100" key={member.id}>
                  <td className="px-3 py-2">{member.name}</td>
                  <td className="px-3 py-2">{member.email}</td>
                  <td className="px-3 py-2">{member.phone ?? "-"}</td>
                  <td className="px-3 py-2">
                    {canManageRoles ? (
                      <select
                        className="select"
                        disabled={member.id === currentUserId}
                        value={member.role}
                        onChange={(event) =>
                          updateRole(member.id, event.target.value as Role)
                        }
                      >
                        {Object.values(Role).map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      member.role
                    )}
                  </td>
                  <td className="px-3 py-2">{new Date(member.createdAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    {canManageRoles && member.id !== currentUserId ? (
                      <button
                        className="btn btn-ghost"
                        disabled={loading}
                        onClick={() => removeMember(member.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="kicker mb-2">Pending invites</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Join link</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const appUrl = typeof window !== "undefined" ? window.location.origin : "";
                const link = `${appUrl}/join?token=${encodeURIComponent(invite.token)}`;
                return (
                  <tr className="border-t border-slate-100" key={invite.id}>
                    <td className="px-3 py-2">{invite.email}</td>
                    <td className="px-3 py-2">{invite.role}</td>
                    <td className="px-3 py-2">{new Date(invite.expiresAt).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <code className="text-xs">{link}</code>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        className="btn btn-ghost"
                        disabled={loading}
                        onClick={() => revokeInvite(invite.id)}
                        type="button"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
              {invites.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    No pending invites.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
