import { Clock, CheckCircle2, User as UserIcon, MessageSquare, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface Activity {
  id: string;
  action: string;
  createdAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
  user: {
    name: string;
    email: string;
  };
  task: {
    title: string;
  };
}

export default function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-center backdrop-blur-md">
        <Clock className="mx-auto h-8 w-8 text-slate-600 mb-2" />
        <h3 className="text-sm font-medium text-slate-300">No recent activity</h3>
        <p className="mt-1 text-xs text-slate-500">Activity in this workspace will appear here.</p>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "TASK_CREATED":
        return <PlusCircle className="h-4 w-4 text-cyan-400" />;
      case "STATUS_UPDATED":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "ASSIGNED":
        return <UserIcon className="h-4 w-4 text-amber-400" />;
      case "COMMENT_ADDED":
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getActionText = (activity: Activity) => {
    switch (activity.action) {
      case "TASK_CREATED":
        return <span>created task <strong className="text-slate-200">&quot;{activity.task.title}&quot;</strong></span>;
      case "STATUS_UPDATED":
        const from = activity.metadata?.from || "Unknown";
        const to = activity.metadata?.to || "Unknown";
        return <span>changed status of <strong className="text-slate-200">&quot;{activity.task.title}&quot;</strong> from <strong className="text-slate-400">{from}</strong> to <strong className="text-emerald-400">{to}</strong></span>;
      case "ASSIGNED":
        return <span>assigned <strong className="text-slate-200">&quot;{activity.task.title}&quot;</strong> to <strong className="text-amber-400">{activity.metadata?.toName || "someone"}</strong></span>;
      default:
        return <span>performed an action on <strong className="text-slate-200">&quot;{activity.task.title}&quot;</strong></span>;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-slate-400" />
        Recent Activity
      </h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="relative flex gap-3">
            {index !== activities.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-slate-800/80"></div>
            )}
            <div className="relative mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
              {getActionIcon(activity.action)}
            </div>
            <div className="flex flex-col pb-1 pt-1.5">
              <p className="text-xs text-slate-400 leading-snug">
                <strong className="text-slate-200">{activity.user.name}</strong> {getActionText(activity)}
              </p>
              <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
