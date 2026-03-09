"use client";

import { Role } from "@prisma/client";
import { useState } from "react";
import { Copy, Loader2, Send, ShieldAlert, UserMinus, X } from "lucide-react";

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
        <div className={`p-4 text-sm rounded-xl border ${error ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
          {error || message}
        </div>
      )}

      {/* Invite Member Minimalist Form */}
      {canManageRoles && (
        <div className="pt-2">
          <p className="text-sm font-medium text-slate-100 mb-4">Add new member</p>
          <div className="flex flex-wrap items-center gap-4">
            <input
              className="bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors flex-1 min-w-[200px] placeholder:text-neutral-600"
              placeholder="teammate@company.com"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              disabled={loading}
            />
            <select
              className="bg-transparent border-b border-white/20 pb-2 text-slate-100 focus:outline-none focus:border-sky-400 transition-colors pr-8 cursor-pointer disabled:opacity-50 appearance-none"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as Role)}
              disabled={loading}
              title={getRoleTooltip(inviteRole)}
            >
              {Object.values(Role).map((role) => (
                <option className="bg-slate-900 text-slate-100" key={role} value={role}>
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
          <p className="mt-3 text-xs text-neutral-500">
            {getRoleTooltip(inviteRole)}
          </p>
        </div>
      )}

      {/* Active Members Minimal List */}
      <div>
        <p className="text-sm tracking-wide text-neutral-500 mb-4 uppercase">Active Members ({members.length})</p>
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div 
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all" 
              key={member.id}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 text-slate-300 font-medium">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-200">{member.name}</p>
                    {member.id === currentUserId && <span className="text-[10px] uppercase tracking-wider text-sky-400 font-medium">You</span>}
                  </div>
                  <p className="text-sm text-neutral-500">{member.email}</p>
                </div>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center gap-6">
                <div className="text-sm text-neutral-400">
                  Joined {new Date(member.createdAt).toLocaleDateString("en-US", { month: 'short', year: 'numeric' })}
                </div>

                <div className="flex items-center gap-3">
                  {canManageRoles ? (
                    <select
                      className="bg-transparent text-sm text-slate-300 focus:outline-none focus:text-sky-400 transition-colors cursor-pointer appearance-none border-b border-transparent hover:border-white/20 pb-0.5"
                      disabled={member.id === currentUserId || loading}
                      value={member.role}
                      onChange={(event) => updateRole(member.id, event.target.value as Role)}
                      title={getRoleTooltip(member.role)}
                    >
                      {Object.values(Role).map((role) => (
                        <option className="bg-slate-900 text-slate-100" key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-300" title={getRoleTooltip(member.role)}>{member.role}</span>
                  )}
                  
                  {canManageRoles && member.id !== currentUserId ? (
                    <button
                      className="text-neutral-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
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
        <div className="pt-4 border-t border-white/5">
          <p className="text-sm tracking-wide text-neutral-500 mb-4 uppercase">Pending Invites ({invites.length})</p>
          <div className="flex flex-col gap-2">
            {invites.map((invite) => {
              const appUrl = typeof window !== "undefined" ? window.location.origin : "";
              const link = `${appUrl}/join?token=${encodeURIComponent(invite.token)}`;
              const isExpired = new Date(invite.expiresAt) < new Date();

              return (
                <div 
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all opacity-70 hover:opacity-100" 
                  key={invite.id}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full border border-dashed border-white/20 flex items-center justify-center text-neutral-500">
                      ?
                    </div>
                    <div>
                      <p className="font-medium text-slate-300">{invite.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-neutral-500">Invited as {invite.role}</span>
                        {isExpired && <span className="text-[10px] uppercase text-red-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Expired</span>}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center gap-6">
                    <button
                      onClick={() => navigator.clipboard.writeText(link)}
                      className="text-xs text-neutral-400 hover:text-sky-400 transition-colors flex items-center gap-1.5"
                      title="Copy join link"
                    >
                      <Copy className="h-3 w-3" /> Copy link
                    </button>
                    
                    <button
                      className="text-neutral-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-400/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
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
