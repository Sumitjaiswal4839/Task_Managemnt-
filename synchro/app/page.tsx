import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  CheckCircle2,
  Kanban,
  Lock,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090d16] text-white">
      {/* Background Decorative Gradients */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-500/15 to-purple-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute top-[600px] -left-60 h-[400px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />

      {/* Top Navigation */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8 border-b border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
            <Image
              src="/icon.png"
              alt="Synchro Logo"
              width={40}
              height={40}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Synchro
            </span>

          </div>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-cyan-500/25 transition hover:brightness-110 active:scale-95"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-20 text-center lg:pt-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/60 px-4 py-1.5 text-xs text-slate-300 backdrop-blur-md mb-8">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Enterprise Collaborative Task Platform • RBAC Protected</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          Orchestrate workflows with{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
            precision & confidence
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
          A lightweight Jira/Trello collaborative workspace. Built with Next.js App Router,
          PostgreSQL, Prisma, strict RBAC authorization, and concurrency protection.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:brightness-110 active:scale-95"
          >
            Open Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#roles"
            className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/70 px-6 py-3.5 text-base font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-95"
          >
            View Permissions Matrix
          </a>
        </div>
      </section>

      {/* 3 Core Roles Section */}
      <section id="roles" className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8 border-t border-slate-800/60">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Role-Based Access Control
          </h2>
          <p className="mt-3 text-slate-400">
            Three distinct roles engineered with zero-trust server-side verification.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Admin Card */}
          <div className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-900/40 p-8 backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-6">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Administrator</h3>
            <p className="mt-2 text-sm text-slate-400">
              Full workspace authority. Can manage users, assign roles, create tasks, and delete records.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" /> User & Role Management
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" /> Create & Assign Tasks
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" /> Hard Task Deletion
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" /> Full Audit Log Access
              </li>
            </ul>
          </div>

          {/* Manager Card */}
          <div className="relative rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-slate-900/40 p-8 backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-6">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Manager</h3>
            <p className="mt-2 text-sm text-slate-400">
              Team operational lead. Creates tasks, sets priorities, assigns team members, and tracks progress.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" /> Create Tasks & Priorities
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" /> Assign Tasks to Members
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" /> Transition Any Task Status
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" /> Team Velocity Metrics
              </li>
            </ul>
          </div>

          {/* Member Card */}
          <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 to-slate-900/40 p-8 backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Team Member</h3>
            <p className="mt-2 text-sm text-slate-400">
              Individual contributor. Focuses on assigned tasks, updates statuses, and collaborates via comments.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" /> View Assigned & Team Tasks
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" /> Update Assigned Task Status
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" /> Add & Manage Comments
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" /> Scoped Personal Dashboard
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 lg:px-8 border-t border-slate-800/60">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 lg:p-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">PostgreSQL & Prisma</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Normalized 3NF schema with composite indexes and referential integrity.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Zero-Trust Security</h4>
                <p className="mt-1 text-xs text-slate-400">
                  HttpOnly cookies, JWT signed sessions, IDOR mitigation, and Zod input validation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Concurrency Safety</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Optimistic Concurrency Control (OCC) versioning prevents lost updates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Kanban className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Interactive Kanban</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Visual drag-and-drop task progression across Todo, In Progress, and Done.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto max-w-7xl px-6 py-8 text-center text-xs text-slate-500 border-t border-slate-800/60">
        Synchro • Enterprise Collaborative Task Management System
      </footer>
    </main>
  );
}
