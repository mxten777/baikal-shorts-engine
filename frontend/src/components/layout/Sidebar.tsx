import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "대시보드" },
  { to: "/new", icon: Plus, label: "새 프로젝트" },
  { to: "/settings", icon: Settings, label: "설정" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gradient-to-b from-baikal-navy via-baikal-navy to-baikal-navy-dark border-r border-baikal-gray-light/50 relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-baikal-cyan/5 to-transparent pointer-events-none" />
      
      {/* 로고 */}
      <div className="relative flex items-center gap-3 px-6 py-6 border-b border-baikal-gray-light/50">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-baikal-cyan to-baikal-cyan-dark flex items-center justify-center shadow-glow">
          <span className="text-baikal-navy font-black text-lg">B</span>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight gradient-text">BAIKAL</p>
          <p className="text-baikal-muted text-xs mt-0.5">Shorts Engine</p>
        </div>
        <Sparkles size={14} className="absolute right-6 text-baikal-cyan/50 animate-pulse" />
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-6 space-y-2">
        {navItems.map((item, index) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden animate-fade-in",
                isActive
                  ? "bg-gradient-to-r from-baikal-cyan/20 to-baikal-cyan/10 text-white shadow-glow-sm"
                  : "text-baikal-muted hover:text-white hover:bg-baikal-gray-light/50"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-baikal-cyan to-baikal-cyan-dark rounded-r-full" />
              )}
              <item.icon 
                size={20} 
                className={cn(
                  "transition-all duration-300",
                  isActive ? "text-baikal-cyan" : "group-hover:scale-110"
                )} 
              />
              <span className="relative z-10">{item.label}</span>
              {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-baikal-cyan/0 via-baikal-cyan/5 to-baikal-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 버전 표시 */}
      <div className="relative px-6 py-4 border-t border-baikal-gray-light/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-baikal-muted-dark text-xs">v0.1.0 · MVP</p>
            <p className="text-baikal-muted-dark text-[10px] mt-0.5">Premium Edition</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-baikal-cyan animate-glow-pulse" />
        </div>
      </div>
    </aside>
  );
}
