import React, { useEffect } from "react";
import { useToastStore } from "@/hooks/useToast";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export function Toaster() {
  const { items, subscribe } = useToastStore();

  useEffect(() => {
    const unsub = subscribe();
    return unsub;
  }, [subscribe]);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {items.map((t) => {
        return (
          <div
            key={t.id}
            className={`toast-item flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium pointer-events-auto ${
              t.type === "success"
                ? "toast-success"
                : t.type === "error"
                ? "toast-error"
                : "toast-info"
            }`}
          >
            {t.type === "success" && <CheckCircle2 size={18} className="shrink-0" />}
            {t.type === "error" && <XCircle size={18} className="shrink-0" />}
            {t.type === "info" && <Info size={18} className="shrink-0" />}
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
