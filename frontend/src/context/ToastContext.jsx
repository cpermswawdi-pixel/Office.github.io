import { createContext, useCallback, useContext, useState } from "react";
import { CircleCheck, CircleX, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const showToast = useCallback((message, type = "success") => {
    if (!message) return;
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, type }].slice(-4));
    window.setTimeout(() => remove(id), 4200);
  }, [remove]);
  return <ToastContext.Provider value={showToast}>
    {children}
    <div aria-live="polite" className="fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toast.type === "error" ? CircleX : CircleCheck;
        return <div key={toast.id} role={toast.type === "error" ? "alert" : "status"} className={`toast-enter flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-lg shadow-slate-900/10 ${toast.type === "error" ? "border-rose-200" : "border-emerald-200"}`}>
          <Icon size={20} className={toast.type === "error" ? "mt-0.5 shrink-0 text-rose-500" : "mt-0.5 shrink-0 text-emerald-600"} />
          <p className="flex-1 text-sm leading-5 text-slate-700">{toast.message}</p>
          <button onClick={() => remove(toast.id)} aria-label="ปิดการแจ้งเตือน" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={15} /></button>
        </div>;
      })}
    </div>
  </ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
