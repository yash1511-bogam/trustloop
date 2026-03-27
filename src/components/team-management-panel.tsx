"use client";

import { Role } from "@prisma/client";
import { useState } from "react";
import { UsersThree } from "@phosphor-icons/react";
import { EmptyState } from "@/components/empty-state";
import { Copy, Loader2, Send, ShieldAlert, UserMinus, X } from "@/components/icon-compat";

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

  function getRoleTooltip(role: Role) {
    switch (role) {
      case "OWNER":
        return "Full access, including billing and workspace deletion.";
      case "MANAGER":
        return "Can manage team, API keys, and all incidents.";
      case "AGENT":
      default:
        return "Standard access. Can view and update incidents.";
    }
  }

  return (
    <div className="space-y-12">
      {/* Notifications */}
      {(message || error) && (
        <div className={`p-4 text-sm rounded-xl border ${error ? "bg-[rgba(232,66,66,0.08)] border-[rgba(232,66,66,0.24)] text-[var(--color-danger)]" : "bg-[rgba(22,163,74,0.08)] border-[rgba(22,163,74,0.24)] text-[var(--color-resolve)]"}`}>
          {error || message}
        </div>
      )}

      {/* Invite Member Minimalist Form */}
      {canManageRoles && (
        <div className="pt-2">
          <p className="text-sm font-medium text-[var(--color-title)] mb-4">Add new member</p>
          <div className="flex flex-wrap items-center gap-4">
            <input
              className="bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors flex-1 min-w-[200px] placeholder:text-[var(--color-ghost)]"
              placeholder="teammate@company.com"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              disabled={loading}
            />
            <select
              className="bg-transparent border-b border-[var(--color-rim)] pb-2 text-[var(--color-title)] focus:outline-none focus:border-[var(--color-signal)] transition-colors pr-8 cursor-pointer disabled:opacity-50 appearance-none"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as Role)}
              disabled={loading}
              title={getRoleTooltip(inviteRole)}
            >
              {Object.values(Role).map((role) => (
                <option className="bg-[var(--color-void)] text-[var(--color-title)]" key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button 
              className="btn btn-primary" 
              disabled={loading || !inviteEmail.includes('@')} 
              onClick={createInvite} 
              type="button"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send invite
            </button>
          </div>
          <p className="mt-3 text-xs text-[var(--color-ghost)]">
            {getRoleTooltip(inviteRole)}
          </p>
        </div>
      )}

      {/* Active Members Minimal List */}
      <div>
        <p className="text-sm tracking-wide text-[var(--color-ghost)] mb-4 uppercase">Active Members ({members.length})</p>
        {members.length <= 1 ? (
          <div className="mb-4 rounded-2xl border border-[var(--color-rim)] bg-[var(--color-surface)]">
            <EmptyState
              icon={UsersThree}
              title="Invite your response team."
              description="You’re the only member in this workspace. Add responders, managers, and approvers before the next incident."
            />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div 
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-transparent hover:border-[var(--color-rim)] hover:bg-[var(--color-surface)] transition-all" 
              key={member.id}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-rim)] bg-[rgba(232,87,42,0.08)] font-medium text-[var(--color-body)]">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--color-body)]">{member.name}</p>
                    {member.id === currentUserId && <span className="text-[10px] uppercase tracking-wider text-[var(--color-signal)] font-medium">You</span>}
                  </div>
                  <p className="text-sm text-[var(--color-ghost)]">{member.email}</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center gap-6">
                <div className="text-sm text-[var(--color-subtext)]">
                  Joined {new Date(member.createdAt).toLocaleDateString("en-US", { month: 'short', year: 'numeric' })}
                </div>

                <div className="flex items-center gap-3">
                  {canManageRoles ? (
                    <select
                      className="bg-transparent text-sm text-[var(--color-body)] focus:outline-none focus:text-[var(--color-signal)] transition-colors cursor-pointer appearance-none border-b border-transparent hover:border-[var(--color-rim)] pb-0.5"
                      disabled={member.id === currentUserId || loading}
                      value={member.role}
                      onChange={(event) => updateRole(member.id, event.target.value as Role)}
                      title={getRoleTooltip(member.role)}
                    >
                      {Object.values(Role).map((role) => (
                        <option className="bg-[var(--color-void)] text-[var(--color-title)]" key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-[var(--color-body)]" title={getRoleTooltip(member.role)}>{member.role}</span>
                  )}
                  
                  {canManageRoles && member.id !== currentUserId ? (
                    <button
                      className="text-[var(--color-ghost)] hover:text-[var(--color-danger)] transition-colors p-2 rounded-lg hover:bg-[rgba(232,66,66,0.08)] opacity-0 group-hover:opacity-100 focus:opacity-100"
                      disabled={loading}
                      onClick={() => removeMember(member.id)}
                      type="button"
                      title="Remove member"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  ) : <div className="w-8"></div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites Minimal List */}
      {invites.length > 0 && (
        <div className="pt-4 border-t border-[var(--color-rim)]">
          <p className="text-sm tracking-wide text-[var(--color-ghost)] mb-4 uppercase">Pending Invites ({invites.length})</p>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => {
              const appUrl = typeof window !== "undefined" ? window.location.origin : "";
              const link = `${appUrl}/join?token=${encodeURIComponent(invite.token)}`;
              const isExpired = new Date(invite.expiresAt) < new Date();

              return (
                <div 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-transparent hover:border-[var(--color-rim)] hover:bg-[var(--color-surface)] transition-all opacity-70 hover:opacity-100" 
                  key={invite.id}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full border border-dashed border-[var(--color-rim)] flex items-center justify-center text-[var(--color-ghost)]">
                      ?
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-body)]">{invite.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--color-ghost)]">Invited as {invite.role}</span>
                        {isExpired && <span className="text-[10px] uppercase text-[var(--color-danger)] flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Expired</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center gap-6">
                    <button
                      onClick={() => navigator.clipboard.writeText(link)}
                      className="text-xs text-[var(--color-subtext)] hover:text-[var(--color-signal)] transition-colors flex items-center gap-1.5"
                      title="Copy join link"
                    >
                      <Copy className="h-3 w-3" /> Copy link
                    </button>
                    
                    <button
                      className="text-[var(--color-ghost)] hover:text-[var(--color-danger)] transition-colors p-2 rounded-lg hover:bg-[rgba(232,66,66,0.08)] opacity-0 group-hover:opacity-100 focus:opacity-100"
                      disabled={loading}
                      onClick={() => revokeInvite(invite.id)}
                      type="button"
                      title="Revoke invite"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
