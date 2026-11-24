import { AlertTriangle } from "lucide-react";
import Modal from "./Modal.jsx";

export default function ConfirmDialog({ title = "ยืนยันการทำรายการ", description, confirmLabel = "ยืนยัน", onConfirm, onClose, busy = false }) {
  return <Modal title={title} onClose={onClose}>
    <div className="flex gap-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle size={21} /></div>
      <div><p className="font-medium text-slate-800">{description}</p><p className="mt-1 text-sm text-slate-500">การดำเนินการนี้อาจไม่สามารถย้อนกลับได้</p></div>
    </div>
    <div className="mt-7 flex justify-end gap-2">
      <button onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">ยกเลิก</button>
      <button onClick={onConfirm} disabled={busy} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? "กำลังดำเนินการ..." : confirmLabel}</button>
    </div>
  </Modal>;
}
