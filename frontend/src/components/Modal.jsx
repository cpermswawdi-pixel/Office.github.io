import { X } from "lucide-react";
export default function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4"><h2 className="font-semibold text-slate-900">{title}</h2><button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="ปิด"><X size={19} /></button></div>
      <div className="p-6">{children}</div>
    </section>
  </div>;
}
