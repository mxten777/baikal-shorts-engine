import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Plus,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "대시보드" },
  { to: "/new", icon: Plus, label: "새 프로젝트" },
  { to: "/settings", icon: Settings, label: "설정" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-baikal-navy border-r border-baikal-gray-light">
      {/* 로고 */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-baikal-gray-light">
        <div className="w-8 h-8 rounded-lg bg-baikal-cyan flex items-center justify-center">
          <span className="text-baikal-navy font-black text-sm">B</span>
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">BAIKAL</p>
          <p className="text-baikal-muted text-xs">Shorts Engine</p>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-baikal-gray-light text-white"
                  : "text-baikal-muted hover:text-white hover:bg-baikal-gray"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 버전 표시 */}
      <div className="px-6 py-4 border-t border-baikal-gray-light">
        <p className="text-baikal-muted text-xs">v0.1.0 · MVP</p>
      </div>
    </aside>
  );
}
