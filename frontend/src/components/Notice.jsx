import { useEffect } from "react";
import { useToast } from "../context/ToastContext.jsx";

export default function Notice({ message, type = "error" }) {
  const showToast = useToast();
  useEffect(() => {
    if (message) showToast?.(message, type === "error" ? "error" : "success");
  }, [message, showToast, type]);
  if (!message) return null;
  return <div role="alert" className={`mb-4 rounded-lg border px-4 py-3 text-sm ${type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</div>;
}
