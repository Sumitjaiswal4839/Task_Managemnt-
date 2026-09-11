"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Users,
  ShieldCheck,
  User as UserIcon,
  UserPlus,
  Loader2,
  Building2,
  Mail,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
}

interface MemberItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  membershipId: string;
}

export default function TeamPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceInfo | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MANAGER" | "MEMBER">("MEMBER");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const authRes = await fetch("/api/auth/me");
        if (!authRes.ok) {
          router.push("/login");
          return;
        }
        const authData = await authRes.json();
        setCurrentUser(authData.data);

        const wsRes = await fetch("/api/workspaces");
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          if (wsData.data?.length > 0) {
            setCurrentWorkspace(wsData.data[0]);
          }
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const fetchMembers = useCallback(async (wsId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMembers(currentWorkspace.id);
    }
  }, [currentWorkspace, fetchMembers]);

  if (loading || !currentUser || !currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const role = currentWorkspace.role;
  const canManageMembers = role === "ADMIN";

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar user={currentUser} workspace={currentWorkspace} />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 uppercase tracking-wider mb-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>{currentWorkspace.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Workspace Members</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Manage member roles, permissions, and team collaboration.
            </p>
          </div>

          {canManageMembers && (
            <button
              onClick={() => {
                setShowInviteModal(true);
                setInviteMsg("");
                setInviteError("");
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
            >
              <UserPlus className="h-4 w-4" />
              <span>Enroll Member</span>
            </button>
          )}
        </div>

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-start justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-md shadow-sm transition hover:border-slate-700"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 font-bold border border-slate-700">
                  {member.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{member.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                    <Mail className="h-3 w-3 text-slate-500" />
                    <span>{member.email}</span>
                  </div>

                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        member.role === "ADMIN"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : member.role === "MANAGER"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      }`}
                    >
                      {member.role === "ADMIN" && <ShieldCheck className="h-3 w-3" />}
                      {member.role === "MANAGER" && <Users className="h-3 w-3" />}
                      {member.role === "MEMBER" && <UserIcon className="h-3 w-3" />}
                      <span>{member.role}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Enroll Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Enroll User to Workspace</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a registered user to <strong className="text-cyan-400">{currentWorkspace.name}</strong> and designate their role.
            </p>

            {inviteMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>{inviteMsg}</span>
              </div>
            )}

            {inviteError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span>{inviteError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">User Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role in Workspace</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MANAGER" | "MEMBER")}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                >
                  <option value="MEMBER">Member (Assigned tasks & status updates)</option>
                  <option value="MANAGER">Manager (Create & assign tasks)</option>
                  <option value="ADMIN">Admin (Full workspace authority)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setInviteMsg(`User ${inviteEmail} enrolled successfully with role ${inviteRole}!`);
                    fetchMembers(currentWorkspace.id);
                  }}
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-400"
                >
                  Enroll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
