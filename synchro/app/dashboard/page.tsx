"use client";

import { useEffect, useState, useCallback } from "react";

import Navbar from "@/components/Navbar";
import TaskDetailModal from "@/components/TaskDetailModal";
import ActivityTimeline from "@/components/ActivityTimeline";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ListTodo,
  User as UserIcon,
  X,
  Loader2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Building2,
} from "lucide-react";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  tasksCount: number;
  membersCount: number;
}

interface MemberInfo {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
}

interface TaskItem {
  id: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string | null;
  version: number;
  assignedTo?: { id: string; name: string; email: string } | null;
  createdBy?: { id: string; name: string; email: string } | null;
  commentsCount: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);

  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  
  // Analytics State
  const [analytics, setAnalytics] = useState<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    overdueTasks: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
  } | null>(null);

  // Create Task Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPriority, setCreatePriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [createAssignee, setCreateAssignee] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // 1. Fetch authenticated session & user's workspaces
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
          const list: WorkspaceInfo[] = wsData.data || [];

          if (list.length > 0) {
            setCurrentWorkspace(list[0]);
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

  // 2. Fetch tasks for current workspace
  const fetchTasks = useCallback(async (wsId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/tasks?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.data?.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 3. Fetch workspace members for assignment
  const fetchMembers = useCallback(async (wsId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/members`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // 4. Fetch Native Analytics
  const fetchAnalytics = useCallback(async (wsId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${wsId}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
    }
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTasks(currentWorkspace.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMembers(currentWorkspace.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnalytics(currentWorkspace.id);
    }
  }, [currentWorkspace, fetchTasks, fetchMembers, fetchAnalytics]);

  // Handle Status Transition
  async function handleStatusChange(task: TaskItem, newStatus: "TODO" | "IN_PROGRESS" | "DONE") {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, version: task.version }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error?.message || "Failed to update status");
      } else {
        toast.success("Task status updated");
      }
      fetchTasks(currentWorkspace.id);
      fetchAnalytics(currentWorkspace.id);
    } catch {
      toast.error("Network error updating status");
    }
  }

  // Handle Task Creation
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!currentWorkspace) return;
    setCreateError("");
    setCreateLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle,
          description: createDesc || undefined,
          priority: createPriority,
          status: "TODO",
          assignedToId: createAssignee || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data.error?.message || "Failed to create task");
        setCreateLoading(false);
        return;
      }

      setShowCreateModal(false);
      setCreateTitle("");
      setCreateDesc("");
      setCreateAssignee("");
      setCreateLoading(false);
      toast.success("Task created successfully");
      fetchTasks(currentWorkspace.id);
      fetchAnalytics(currentWorkspace.id);
    } catch {
      setCreateError("An unexpected network error occurred.");
      setCreateLoading(false);
    }
  }

  // Filtering calculations
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Use backend analytics instead of calculating from local array
  const totalCount = analytics?.totalTasks || 0;
  const todoCount = analytics?.byStatus?.TODO || 0;
  const inProgressCount = analytics?.byStatus?.IN_PROGRESS || 0;
  const doneCount = analytics?.byStatus?.DONE || 0;
  const completionRate = analytics?.completionRate || 0;

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const role = currentWorkspace?.role || "MEMBER";

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar user={currentUser} workspace={currentWorkspace || undefined} />

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Workspace Title & Create Task */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 uppercase tracking-wider mb-1">
              <Building2 className="h-3.5 w-3.5" />
              <span>{currentWorkspace?.name || "Workspace"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Workspace Overview</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Collaborative tasks, real-time status updates, and team workflows.
            </p>
          </div>

          {(role === "ADMIN" || role === "MANAGER") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Tasks</span>
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-3xl font-extrabold text-white">{totalCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">To Do</span>
              <ListTodo className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold text-amber-400">{todoCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">In Progress</span>
              <Clock className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-3xl font-extrabold text-cyan-400">{inProgressCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-400">{doneCount}</p>
            <p className="mt-1 text-[10px] text-slate-500">{completionRate}% completion rate</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks in this workspace..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none transition focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 text-xs">
              {["ALL", "TODO", "IN_PROGRESS", "DONE"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    statusFilter === s ? "bg-cyan-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s === "IN_PROGRESS" ? "In Progress" : s === "ALL" ? "All" : s === "TODO" ? "To Do" : "Done"}
                </button>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        {/* Task Grid */}
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <ListTodo className="h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No tasks found in this workspace</h3>
            <p className="mt-1 text-xs text-slate-500">
              {search || statusFilter !== "ALL"
                ? "Try adjusting your search query or filters."
                : "Create a new task to get started."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => {
              const canChange =
                role === "ADMIN" ||
                role === "MANAGER" ||
                (role === "MEMBER" && task.assignedTo?.id === currentUser.id);

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700 hover:shadow-lg backdrop-blur-md cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          task.priority === "HIGH"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : task.priority === "MEDIUM"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-slate-700/40 text-slate-300 border border-slate-700/50"
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE" && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                          OVERDUE
                        </span>
                      )}
                      
                      <div className="flex-1"></div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          task.status === "DONE"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : task.status === "IN_PROGRESS"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {task.status === "IN_PROGRESS" ? "IN PROGRESS" : task.status}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-white line-clamp-2 hover:text-cyan-300 transition">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1.5 text-xs text-slate-400 line-clamp-3">{task.description}</p>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                        <span className="font-medium text-slate-300">
                          {task.assignedTo ? task.assignedTo.name : "Unassigned"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <MessageSquare className="h-3 w-3" />
                        <span>{task.commentsCount}</span>
                      </div>
                    </div>

                    {canChange && (
                      <div
                        className="flex items-center gap-1.5 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-medium text-slate-500">Move to:</span>
                        {task.status !== "TODO" && (
                          <button
                            onClick={() => handleStatusChange(task, "TODO")}
                            className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                          >
                            To Do
                          </button>
                        )}
                        {task.status !== "IN_PROGRESS" && (
                          <button
                            onClick={() => handleStatusChange(task, "IN_PROGRESS")}
                            className="rounded bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 text-[10px] text-cyan-300 hover:bg-cyan-900/60"
                          >
                            In Progress
                          </button>
                        )}
                        {task.status !== "DONE" && (
                          <button
                            onClick={() => handleStatusChange(task, "DONE")}
                            className="rounded bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-900/60"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Activity Timeline */}
        <div className="mt-8">
          <ActivityTimeline activities={analytics?.recentActivity || []} />
        </div>
      </main>

      {/* Task Details Modal */}
      {selectedTaskId && currentWorkspace && (
        <TaskDetailModal
          taskId={selectedTaskId}
          workspaceId={currentWorkspace.id}
          currentUserRole={role}
          currentUserId={currentUser.id}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => fetchTasks(currentWorkspace.id)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Create Workspace Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-2.5 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Implement Argon2id password verification"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Task specifications, context, or acceptance criteria..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                    <select
                      value={createPriority}
                      onChange={(e) => setCreatePriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                    >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assignee</label>
                  <select
                    value={createAssignee}
                    onChange={(e) => setCreateAssignee(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-400 disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Task"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
