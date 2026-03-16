import React from "react";
import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/Toaster";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-baikal-navy via-baikal-navy to-baikal-navy-dark font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto relative">
        {/* Background Pattern */}
        <div className="fixed inset-0 pointer-events-none opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0, 212, 255, 0.3) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-8 py-10">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
