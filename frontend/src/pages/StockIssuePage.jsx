import { useCallback, useEffect, useState } from "react";
import { ArrowUpFromLine, PackageCheck, Search } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

export default function StockIssuePage() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/requisitions", { params: { status: "APPROVED", limit: 100 } });
      setRequests(data.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const fulfill = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/requisitions/${selected.id}/fulfill`);
      setMessage(`จ่ายวัสดุตามคำขอ ${selected.requestNumber} แล้ว`);
      setSelected(null);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const visible = requests.filter((request) => `${request.requestNumber} ${request.requester.name} ${request.department.name}`.toLowerCase().includes(filter.toLowerCase()));
  return <div className="space-y-5">
    <PageHeader title="จ่ายวัสดุ" description="ดำเนินการจ่ายจากคำขอที่ได้รับอนุมัติแล้ว ระบบจะตัดยอดคลังพร้อมบันทึกประวัติอัตโนมัติ" />
    <Notice message={message} type="success" />
    <Notice message={error} />
    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><PackageCheck size={18} /></span><div><h2 className="text-sm font-bold text-[#142B4A]">คำขอรอจ่าย</h2><p className="mt-0.5 text-[11px] text-slate-400">{requests.length} รายการได้รับอนุมัติ</p></div></div>
        <div className="relative w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="ค้นหาเลขที่คำขอหรือผู้เบิก" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></div>
      </div>
      <div className="divide-y divide-slate-100">
        {loading ? [1, 2, 3].map((row) => <div key={row} className="animate-pulse space-y-3 px-5 py-5"><div className="h-4 w-44 rounded bg-slate-100" /><div className="h-3 w-2/3 rounded bg-slate-100" /></div>) : visible.map((request) => <article key={request.id} className="px-5 py-5 transition-colors hover:bg-blue-50/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#142B4A]">{request.requestNumber}</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">อนุมัติแล้ว</span></div>
              <p className="mt-1 text-xs text-slate-500">{request.requester.name} · {request.department.name} · อนุมัติโดย {request.decidedBy?.name || "—"}</p>
              <p className="mt-2 text-sm text-slate-700">{request.purpose}</p>
              <div className="mt-3 flex flex-wrap gap-2">{request.items.map((item) => <span key={item.id} className={`rounded-lg px-2.5 py-1.5 text-[11px] ${item.product.stockQuantity < item.quantity ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>{item.product.name} <strong className="ml-1">{item.quantity} {item.product.unit}</strong><span className="ml-2">คงเหลือ {item.product.stockQuantity}</span></span>)}</div>
            </div>
            <button onClick={() => setSelected(request)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#142B4A] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-900"><ArrowUpFromLine size={16} />ยืนยันจ่ายวัสดุ</button>
          </div>
        </article>)}
        {!loading && !visible.length && <div className="px-5 py-16 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-600"><PackageCheck size={20} /></div><p className="mt-3 text-sm font-medium text-slate-600">{filter ? "ไม่พบคำขอตามคำค้นหา" : "ไม่มีคำขอรอจ่าย"}</p><p className="mt-1 text-xs text-slate-400">คำขอที่ได้รับอนุมัติจะแสดงในหน้านี้</p></div>}
      </div>
    </section>
    {selected && <ConfirmDialog title="ยืนยันการจ่ายวัสดุ" description={`จ่ายวัสดุตามคำขอ ${selected.requestNumber} และตัดยอดคงเหลือทันทีใช่หรือไม่?`} confirmLabel="ยืนยันจ่าย" onClose={() => setSelected(null)} onConfirm={fulfill} busy={busy} />}
  </div>;
}
