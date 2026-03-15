import React from "react";
import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/Toaster";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-baikal-navy font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
