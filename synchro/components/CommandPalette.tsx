"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Command } from "cmdk";
import { CheckCircle2, ListTodo, Search, Settings, Home } from "lucide-react";
import "./cmdk.css";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      
      if (!open && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        if (e.key === "/") {
          e.preventDefault();
          setOpen(true);
        }
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open]);

  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[20vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Global Command Menu" className="flex h-full w-full flex-col overflow-hidden bg-transparent">
          <div className="flex items-center border-b border-slate-800 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
            <Command.Input 
              autoFocus
              placeholder="Type a command or search..." 
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 text-slate-100"
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">No results found.</Command.Empty>
            
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-slate-400">
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-slate-200 outline-none hover:bg-cyan-500/20 hover:text-cyan-400 data-[selected=true]:bg-cyan-500/20 data-[selected=true]:text-cyan-400"
              >
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/tasks"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-slate-200 outline-none hover:bg-cyan-500/20 hover:text-cyan-400 data-[selected=true]:bg-cyan-500/20 data-[selected=true]:text-cyan-400"
              >
                <ListTodo className="mr-2 h-4 w-4" />
                <span>My Tasks</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/settings"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-slate-200 outline-none hover:bg-cyan-500/20 hover:text-cyan-400 data-[selected=true]:bg-cyan-500/20 data-[selected=true]:text-cyan-400"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>
            
            <div className="h-px bg-slate-800 my-1" />
            
            <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-slate-400">
              <Command.Item 
                onSelect={() => {
                  setOpen(false);
                  if (pathname === "/dashboard") {
                     document.dispatchEvent(new CustomEvent('openCreateTask'));
                  } else {
                     router.push("/dashboard");
                  }
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-slate-200 outline-none hover:bg-emerald-500/20 hover:text-emerald-400 data-[selected=true]:bg-emerald-500/20 data-[selected=true]:text-emerald-400"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                <span>Create Task</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
