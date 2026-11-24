import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
    <p>แสดง {start}–{end} จาก {total} รายการ</p>
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40" aria-label="หน้าก่อน"><ChevronLeft size={16} /></button>
      <span className="min-w-16 text-center text-xs">หน้า {page} / {pages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40" aria-label="หน้าถัดไป"><ChevronRight size={16} /></button>
    </div>
  </div>;
}
