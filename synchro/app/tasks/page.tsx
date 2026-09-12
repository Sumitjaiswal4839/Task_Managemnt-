"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TaskDetailModal from "@/components/TaskDetailModal";
import { toast } from "sonner";
import { getPusherClient } from "@/lib/pusher";
import {
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ListTodo,
  User as UserIcon,
  MessageSquare,
  Loader2,
  X,
  AlertCircle,
  Search,
} from "lucide-react";

interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
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

export default function KanbanPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceInfo | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Create Task Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPriority, setCreatePriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [createAssignee, setCreateAssignee] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Init session & workspaces
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

  const fetchTasks = useCallback(async (wsId: string, searchQ?: string, priority?: string) => {
    try {
      const p = new URLSearchParams();
      p.set("limit", "100");
      if (searchQ) p.set("search", searchQ);
      if (priority && priority !== "ALL") p.set("priority", priority);
      
      const res = await fetch(`/api/workspaces/${wsId}/tasks?${p.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.data?.items || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

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

  useEffect(() => {
    if (currentWorkspace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTasks(currentWorkspace.id, debouncedSearch, priorityFilter);
      fetchMembers(currentWorkspace.id);
    }
  }, [currentWorkspace, fetchTasks, fetchMembers, debouncedSearch, priorityFilter]);

  // Setup Pusher real-time listening
  useEffect(() => {
    if (!currentWorkspace) return;
    
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-workspace-${currentWorkspace.id}`);
    
    channel.bind("task.created", (newTask: TaskItem) => {
      setTasks((prev) => [newTask, ...prev]);
    });

    channel.bind("task.updated", (updatedTask: TaskItem) => {
      setTasks((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });

    channel.bind("task.deleted", (payload: { id: string }) => {
      setTasks((prev) => prev.filter(t => t.id !== payload.id));
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [currentWorkspace]);

  // Handle Status Update
  async function handleStatusChange(task: TaskItem, newStatus: "TODO" | "IN_PROGRESS" | "DONE") {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, version: task.version }),
      });

      if (!res.ok) {
        const d = await res.json();
        if (res.status === 409) {
          toast.error(`Concurrency Error: ${d.error?.message || "Task modified by someone else."}\nRefreshing tasks...`);
        } else {
          toast.error(d.error?.message || "Failed to update status");
        }
      } else {
        toast.success("Task status updated");
      }
      fetchTasks(currentWorkspace.id, debouncedSearch, priorityFilter);
    } catch {
      toast.error("Network error updating status");
    }
  }

  // Handle Create Task Submission
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
      fetchTasks(currentWorkspace.id, debouncedSearch, priorityFilter);
    } catch {
      setCreateError("An unexpected network error occurred.");
      setCreateLoading(false);
    }
  }

  if (loading || !currentUser || !currentWorkspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const role = currentWorkspace.role;
  const canCreate = role === "ADMIN" || role === "MANAGER";

  const filteredTasks = tasks; // Filtered on server


  const todoTasks = filteredTasks.filter((t) => t.status === "TODO");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const doneTasks = filteredTasks.filter((t) => t.status === "DONE");

  const columns = [
    { id: "TODO" as const, title: "To Do", icon: ListTodo, color: "amber", items: todoTasks },
    { id: "IN_PROGRESS" as const, title: "In Progress", icon: Clock, color: "cyan", items: inProgressTasks },
    { id: "DONE" as const, title: "Completed", icon: CheckCircle2, color: "emerald", items: doneTasks },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar user={currentUser} workspace={currentWorkspace} />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Kanban Workflow</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Interactive visual columns for tasks in <span className="text-cyan-400 font-semibold">{currentWorkspace.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="rounded-xl border border-slate-800 bg-slate-900/60 py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-transparent outline-none text-xs text-slate-200 cursor-pointer"
                >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Priorities</option>
                <option value="LOW" className="bg-slate-900 text-slate-200">Low</option>
                <option value="MEDIUM" className="bg-slate-900 text-slate-200">Medium</option>
                <option value="HIGH" className="bg-slate-900 text-slate-200">High</option>
              </select>
            </div>
            </div>

            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Kanban Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((col) => {
            const Icon = col.icon;
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-lg backdrop-blur-md min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 ${
                        col.color === "amber"
                          ? "text-amber-400"
                          : col.color === "cyan"
                          ? "text-cyan-400"
                          : "text-emerald-400"
                      }`}
                    />
                    <h3 className="text-sm font-bold text-white">{col.title}</h3>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                    {col.items.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                  {col.items.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-center text-xs text-slate-600 border border-dashed border-slate-900 rounded-xl">
                      No tasks in this stage
                    </div>
                  ) : (
                    col.items.map((task) => {
                      const canChange =
                        role === "ADMIN" ||
                        role === "MANAGER" ||
                        (role === "MEMBER" && task.assignedTo?.id === currentUser.id);

                      return (
                        <div
                          key={task.id}
                          className="group relative rounded-xl border border-slate-800/90 bg-slate-900/70 p-4 shadow-sm transition hover:border-slate-700 hover:shadow-md cursor-pointer"
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                task.priority === "HIGH"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : task.priority === "MEDIUM"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-slate-700/40 text-slate-300 border border-slate-700/50"
                              }`}
                            >
                              {task.priority}
                            </span>

                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <MessageSquare className="h-3 w-3" />
                              <span>{task.commentsCount}</span>
                            </div>
                          </div>

                          <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{task.description}</p>
                          )}

                          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="h-3 w-3 text-slate-500" />
                              <span className="text-[11px] text-slate-300">
                                {task.assignedTo?.name || "Unassigned"}
                              </span>
                            </div>

                            {/* Move status buttons */}
                            {canChange && (
                              <div
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {col.id !== "TODO" && (
                                  <button
                                    onClick={() => handleStatusChange(task, "TODO")}
                                    title="Move to Todo"
                                    className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-300 hover:bg-slate-700"
                                  >
                                    ← Todo
                                  </button>
                                )}
                                {col.id !== "IN_PROGRESS" && (
                                  <button
                                    onClick={() => handleStatusChange(task, "IN_PROGRESS")}
                                    title="Move to In Progress"
                                    className="rounded bg-cyan-950/80 border border-cyan-800/60 px-1.5 py-0.5 text-[9px] text-cyan-300 hover:bg-cyan-900"
                                  >
                                    Progress
                                  </button>
                                )}
                                {col.id !== "DONE" && (
                                  <button
                                    onClick={() => handleStatusChange(task, "DONE")}
                                    title="Move to Completed"
                                    className="rounded bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 text-[9px] text-emerald-300 hover:bg-emerald-900"
                                  >
                                    Done →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Task Details Modal */}
      {selectedTaskId && (
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
              <h3 className="text-base font-semibold text-white">Create Kanban Task</h3>
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
                  placeholder="e.g. Implement drag-and-drop animations"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Task details and acceptance criteria..."
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
