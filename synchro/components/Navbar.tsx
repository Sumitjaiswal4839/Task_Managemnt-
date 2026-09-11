"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Users,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
  workspace?: {
    id: string;
    name: string;
    role: "ADMIN" | "MANAGER" | "MEMBER";
  };
}

export default function Navbar({ user, workspace }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const role = workspace?.role || "MEMBER";

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Kanban Board", icon: Kanban },
    { href: "/team", label: "Team", icon: Users },
  ];

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-800 bg-[#090d16]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand + Workspace */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 overflow-hidden rounded-xl border border-cyan-500/30 shadow-md shadow-cyan-500/20">
              <Image
                src="/icon.png"
                alt="Synchro"
                width={36}
                height={36}
                priority
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Synchro</span>
          </Link>

          {workspace && (
            <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300">
              <Building2 className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-semibold text-white">{workspace.name}</span>
            </div>
          )}
        </div>

        {/* Center: Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: User Profile & Role & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1">
            {role === "ADMIN" && <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />}
            {role === "MANAGER" && <Users className="h-3.5 w-3.5 text-cyan-400" />}
            {role === "MEMBER" && <UserIcon className="h-3.5 w-3.5 text-blue-400" />}
            <span className="text-xs font-semibold text-slate-200 hidden sm:inline">{user.name}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                role === "ADMIN"
                  ? "bg-purple-500/20 text-purple-300"
                  : role === "MANAGER"
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {role}
            </span>
          </div>

          {workspace && <NotificationBell workspaceId={workspace.id} />}

          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900/60 p-2 text-xs font-medium text-slate-400 transition hover:bg-red-500/20 hover:text-red-300 active:scale-95"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
