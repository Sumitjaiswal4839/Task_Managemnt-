import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: {
    default: "Synchro — Collaborative Task Management",
    template: "%s | Synchro",
  },
  description:
    "Enterprise-grade collaborative task management platform featuring role-based access control, realtime workflows, and Kanban management.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#090d16" />
      </head>
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
        <CommandPalette />
        <Toaster theme="dark" richColors position="top-right" />
      </body>
    </html>
  );
}
