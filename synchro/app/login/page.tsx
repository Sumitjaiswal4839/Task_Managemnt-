"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, Users, User, AlertCircle } from "lucide-react";

import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch {
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  }

  function fillCredentials(e: string, p: string) {
    setEmail(e);
    setPassword(p);
    setError("");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#090d16] px-4 py-12 text-white">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[700px] rounded-full bg-cyan-500/15 blur-[140px]" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
              <Image src="/icon.png" alt="Synchro" width={40} height={40} className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Synchro</span>
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-slate-100">Sign in to your workspace</h1>
          <p className="mt-1 text-xs text-slate-400">Enter your credentials or choose a pre-configured test account below</p>
        </div>

        {/* Demo Account Fillers */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-2">
            1-Click Demo Accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials("admin@test.com", "Admin123!")}
              className="flex flex-col items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-950/20 p-2 text-center text-xs text-purple-300 transition hover:bg-purple-900/40 active:scale-95"
            >
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span className="font-semibold">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("manager@test.com", "Manager123!")}
              className="flex flex-col items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2 text-center text-xs text-cyan-300 transition hover:bg-cyan-900/40 active:scale-95"
            >
              <Users className="h-4 w-4 text-cyan-400" />
              <span className="font-semibold">Manager</span>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials("member@test.com", "Member123!")}
              className="flex flex-col items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-950/20 p-2 text-center text-xs text-blue-300 transition hover:bg-blue-900/40 active:scale-95"
            >
              <User className="h-4 w-4 text-blue-400" />
              <span className="font-semibold">Member</span>
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-cyan-400 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090d16]" />}>
      <LoginForm />
    </Suspense>
  );
}
