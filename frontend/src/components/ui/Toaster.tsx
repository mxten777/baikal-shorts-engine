import React, { useEffect } from "react";
import { useToastStore } from "@/hooks/useToast";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export function Toaster() {
  const { items, subscribe } = useToastStore();

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto animate-fade-in ${
            t.type === "success"
              ? "bg-emerald-900/90 border border-emerald-500/40 text-emerald-200"
              : t.type === "error"
              ? "bg-red-900/90 border border-red-500/40 text-red-200"
              : "bg-baikal-gray border border-baikal-gray-light text-white"
          }`}
        >
          {t.type === "success" && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
          {t.type === "error" && <XCircle size={16} className="text-red-400 shrink-0" />}
          {t.type === "info" && <Info size={16} className="text-baikal-cyan shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
