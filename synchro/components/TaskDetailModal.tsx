"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  X,
  MessageSquare,
  History,
  Send,
  Trash2,
  Edit3,
  Calendar,
  AlertCircle,
  Loader2,
  ListTodo,
  Plus,
  Paperclip,
  Download,
  UploadCloud
} from "lucide-react";

interface TaskDetailModalProps {
  taskId: string;
  workspaceId: string;
  currentUserRole: "ADMIN" | "MANAGER" | "MEMBER";
  currentUserId: string;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export default function TaskDetailModal({
  taskId,
  workspaceId,
  currentUserRole,
  currentUserId,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [task, setTask] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"COMMENTS" | "ACTIVITY" | "SUBTASKS" | "ATTACHMENTS">("SUBTASKS");
  const [error, setError] = useState("");

  // Subtask Create state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtaskLoading, setSubtaskLoading] = useState(false);

  // Attachments state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTaskDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setTask(data.data);
        setEditTitle(data.data.title);
        setEditDesc(data.data.description || "");
        setEditPriority(data.data.priority);
        setComments(data.data.comments || []);
      }
      
      const attRes = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/attachments`);
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttachments(attData.data || []);
      }
    } catch {
      setError("Failed to load task details");
    } finally {
      setLoading(false);
    }
  }, [taskId, workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  // Handle Comment Submission
  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (res.ok) {
        setNewComment("");
        fetchTaskDetails();
        onTaskUpdated();
      }
    } catch {
      alert("Failed to submit comment");
    } finally {
      setCommentLoading(false);
    }
  }

  // Handle Subtask Creation
  async function handleCreateSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    setSubtaskLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          priority: "MEDIUM",
          status: "TODO",
          parentId: taskId,
        }),
      });

      if (res.ok) {
        setNewSubtaskTitle("");
        fetchTaskDetails();
      } else {
        alert("Failed to create subtask");
      }
    } catch {
      alert("Network error");
    } finally {
      setSubtaskLoading(false);
    }
  }

  // Handle File Upload via Cloudinary
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input immediately
    if (e.target) e.target.value = "";

    setUploading(true);
    const toastId = toast.loading("Uploading attachment to Cloudinary...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to upload file");
      }

      toast.success("File securely uploaded", { id: toastId });
      fetchTaskDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error during upload", { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  // Handle Task Edit Save
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
          priority: editPriority,
          version: task.version,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchTaskDetails();
        onTaskUpdated();
      } else {
        const data = await res.json();
        if (res.status === 409) {
          alert(`Concurrency Error: ${data.error?.message || "Task modified by someone else."}\nRefreshing task...`);
          fetchTaskDetails(); // refresh task from server
        } else {
          alert(data.error?.message || "Failed to update task");
        }
      }
    } catch {
      alert("Network error updating task");
    } finally {
      setSavingEdit(false);
    }
  }

  // Handle Task Deletion (Admin only)
  async function handleDeleteTask() {
    if (!confirm("Are you sure you want to permanently delete this task?")) return;

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        onTaskUpdated();
        onClose();
      } else {
        const d = await res.json();
        alert(d.error?.message || "Failed to delete task");
      }
    } catch {
      alert("Network error deleting task");
    }
  }

  // Handle Status Update
  async function handleStatusChange(newStatus: "TODO" | "IN_PROGRESS" | "DONE") {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, version: task.version }),
      });

      if (res.ok) {
        fetchTaskDetails();
        onTaskUpdated();
      } else {
        const d = await res.json();
        alert(d.error?.message || "Failed to change status");
      }
    } catch {
      alert("Network error updating status");
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!task) return null;

  const canEdit = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";
  const canDelete = currentUserRole === "ADMIN";
  const canChangeStatus =
    currentUserRole === "ADMIN" ||
    currentUserRole === "MANAGER" ||
    (currentUserRole === "MEMBER" && task.assignedToId === currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex flex-col max-h-[90vh] w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                task.priority === "HIGH"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : task.priority === "MEDIUM"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-slate-700/40 text-slate-300 border border-slate-700/50"
              }`}
            >
              {task.priority}
            </span>

            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
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

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={handleDeleteTask}
                title="Delete Task"
                className="rounded-lg border border-red-500/30 bg-red-950/30 p-1.5 text-xs text-red-400 hover:bg-red-900/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Edit Form or Display */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-white">{task.title}</h2>
              <p className="mt-2 text-xs text-slate-300 whitespace-pre-wrap">
                {task.description || "No description provided."}
              </p>
            </div>
          )}

          {/* Metadata Chips: Assignee, Created By, Due Date */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Assignee</span>
              <span className="font-semibold text-slate-200">
                {task.assignedTo ? task.assignedTo.name : "Unassigned"}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Created By</span>
              <span className="font-semibold text-slate-200">{task.createdBy?.name || "System"}</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Due Date</span>
              <div className="flex items-center gap-1 text-slate-200">
                <Calendar className="h-3 w-3 text-cyan-400" />
                <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "None"}</span>
              </div>
            </div>
          </div>

          {/* Quick Status Movement */}
          {canChangeStatus && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
              <span className="text-xs font-medium text-slate-400 block mb-2">Change Status:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={task.status === "TODO"}
                  onClick={() => handleStatusChange("TODO")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    task.status === "TODO"
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  To Do
                </button>
                <button
                  disabled={task.status === "IN_PROGRESS"}
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    task.status === "IN_PROGRESS"
                      ? "bg-cyan-950/60 text-cyan-600 cursor-not-allowed"
                      : "bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900"
                  }`}
                >
                  In Progress
                </button>
                <button
                  disabled={task.status === "DONE"}
                  onClick={() => handleStatusChange("DONE")}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                    task.status === "DONE"
                      ? "bg-emerald-950/60 text-emerald-600 cursor-not-allowed"
                      : "bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900"
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          )}

          {/* Tabs: Comments vs Activity */}
          <div className="pt-2">
            <div className="flex items-center gap-4 border-b border-slate-800 mb-4">
              <button
                onClick={() => setActiveTab("SUBTASKS")}
                className={`flex items-center gap-1.5 pb-2 text-xs font-medium transition border-b-2 ${
                  activeTab === "SUBTASKS"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ListTodo className="h-3.5 w-3.5" />
                <span>Subtasks ({task.subTasks?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("COMMENTS")}
                className={`flex items-center gap-1.5 pb-2 text-xs font-medium transition border-b-2 ${
                  activeTab === "COMMENTS"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Comments ({comments.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("ACTIVITY")}
                className={`flex items-center gap-1.5 pb-2 text-xs font-medium transition border-b-2 ${
                  activeTab === "ACTIVITY"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>Audit ({task.activities?.length || 0})</span>
              </button>
              
              <button
                onClick={() => setActiveTab("ATTACHMENTS")}
                className={`flex items-center gap-1.5 pb-2 text-xs font-medium transition border-b-2 ${
                  activeTab === "ATTACHMENTS"
                    ? "border-cyan-400 text-cyan-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Files ({attachments.length})</span>
              </button>
            </div>

            {/* Tab: Attachments */}
            {activeTab === "ATTACHMENTS" && (
              <div className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {attachments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No attachments yet.</p>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    attachments.map((att: any) => (
                      <div key={String(att.id)} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs transition hover:border-slate-700">
                        <div className="flex flex-col">
                          <a href={`/api/workspaces/${workspaceId}/tasks/${taskId}/attachments/${att.id}/download`} className="font-medium text-cyan-400 hover:underline">
                            {att.originalName}
                          </a>
                          <span className="text-[10px] text-slate-500 mt-1">
                            {(att.size / 1024).toFixed(1)} KB • Uploaded by {att.uploadedBy?.name || "Unknown"}
                          </span>
                        </div>
                        <a href={`/api/workspaces/${workspaceId}/tasks/${taskId}/attachments/${att.id}/download`} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-700 bg-slate-950/50 py-4 text-xs text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        <span>Click to upload a file</span>
                      </>
                    )}
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            )}

            {/* Tab: Subtasks */}
            {activeTab === "SUBTASKS" && (
              <div className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {Array.isArray(task.subTasks) && task.subTasks.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No subtasks found.</p>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    Array.isArray(task.subTasks) && task.subTasks.map((sub: any) => (
                      <div key={String(sub.id)} className="flex flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs transition hover:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${sub.status === "DONE" ? "text-slate-500 line-through" : "text-white"}`}>
                            {sub.title}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              sub.status === "DONE"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : sub.status === "IN_PROGRESS"
                                ? "bg-cyan-500/20 text-cyan-400"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {canEdit && (
                  <form onSubmit={handleCreateSubtask} className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <input
                      type="text"
                      required
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add a new subtask..."
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={subtaskLoading}
                      className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {subtaskLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Tab 1: Comments */}
            {activeTab === "COMMENTS" && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">No comments yet. Start the conversation!</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="font-semibold text-slate-200">{c.author?.name}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-slate-300">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    required
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment or status note..."
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={commentLoading}
                    className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {commentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Activity Audit Timeline */}
            {activeTab === "ACTIVITY" && (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {Array.isArray(task.activities) && task.activities.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No audit history recorded.</p>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  Array.isArray(task.activities) && task.activities.map((a: any) => (
                    <div key={String(a.id)} className="flex items-start gap-2 text-xs border-l-2 border-slate-700 pl-3 py-1">
                      <div>
                        <p className="text-slate-300">
                          <span className="font-semibold text-cyan-400">{a.user?.name}</span>:{" "}
                          <span className="font-mono text-[11px] text-slate-400">{a.action}</span>
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
