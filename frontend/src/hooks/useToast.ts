import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function emit() {
  listeners.forEach((l) => l([...toasts]));
}

export function toast(message: string, type: Toast["type"] = "info") {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3000);
}

toast.success = (message: string) => toast(message, "success");
toast.error = (message: string) => toast(message, "error");

export function useToastStore() {
  const [items, setItems] = useState<Toast[]>([]);
  const subscribe = useCallback(() => {
    const handler = (t: Toast[]) => setItems(t);
    listeners.push(handler);
    setItems([...toasts]);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);
  return { items, subscribe };
}
