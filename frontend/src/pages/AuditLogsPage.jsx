import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";

const dateTime = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });
export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/reports/audit-logs", { params: { limit: 200 } })
      .then(({ data }) => setLogs(data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? logs.filter((log) => [log.username, log.action, log.module, log.recordId, log.ipAddress].some((value) => String(value || "").toLowerCase().includes(term))) : logs;
  }, [logs, search]);
  return <>
    <PageHeader title="ประวัติการใช้งานระบบ" description="ตรวจสอบผู้ทำรายการ เวลา และรายละเอียดการเปลี่ยนแปลงย้อนหลัง" />
    <Notice message={error} />
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาผู้ใช้ การกระทำ หรือโมดูล" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-500" /></div>
        <p className="text-sm text-slate-500">แสดง {visible.length} จาก {logs.length} รายการล่าสุด</p>
      </div>
      <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr>{["วันเวลา", "ผู้ใช้", "การกระทำ", "โมดูล", "Record ID", "IP", "รายละเอียด"].map((item) => <th key={item} className="px-4 py-3 font-semibold">{item}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map((log) => <tr key={log.id} className="align-top hover:bg-slate-50/60">
            <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateTime.format(new Date(log.createdAt))}</td>
            <td className="px-4 py-3 font-medium text-slate-800">{log.username || log.user?.name || "ระบบ"}</td>
            <td className="px-4 py-3"><span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">{log.action}</span></td>
            <td className="px-4 py-3 text-slate-600">{log.module}</td>
            <td className="px-4 py-3 text-slate-500">{log.recordId || "—"}</td>
            <td className="px-4 py-3 text-slate-500">{log.ipAddress || "—"}</td>
            <td className="px-4 py-3">
              {(log.previousValue || log.updatedValue) ? <details className="max-w-[360px]"><summary className="cursor-pointer text-xs font-medium text-sky-700">ดูรายละเอียด</summary><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">{JSON.stringify({ previous: log.previousValue, updated: log.updatedValue }, null, 2)}</pre></details> : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><ClipboardList size={14} />ไม่มีรายละเอียดเพิ่มเติม</span>}
            </td>
          </tr>)}
          {!loading && !visible.length && <tr><td colSpan="7" className="py-14 text-center text-slate-400">{error ? "ไม่สามารถโหลดประวัติได้" : "ไม่พบรายการประวัติ"}</td></tr>}
          {loading && <tr><td colSpan="7" className="py-14 text-center text-slate-400">กำลังโหลดประวัติ...</td></tr>}
        </tbody>
      </table></div>
    </section>
  </>;
}
