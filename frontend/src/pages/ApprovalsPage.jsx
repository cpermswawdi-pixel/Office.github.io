import { useCallback, useEffect, useState } from "react";
import { Check, ClipboardCheck, X } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Modal from "../components/Modal.jsx";

export default function ApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [confirming, setConfirming] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/requisitions", { params: { status: "PENDING", limit: 100 } });
      setRequests(data.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const decide = async (request, decision, note = null) => {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/requisitions/${request.id}/decision`, { decision, decisionNote: note });
      setConfirming(null);
      setRejecting(null);
      setDecisionNote("");
      setMessage(decision === "APPROVED" ? `อนุมัติคำขอ ${request.requestNumber} แล้ว` : `ปฏิเสธคำขอ ${request.requestNumber} แล้ว`);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-5">
    <PageHeader title="อนุมัติคำขอเบิก" description="ตรวจสอบคำขอและพิจารณาก่อนส่งให้คลังจ่ายวัสดุ" />
    <Notice message={message} type="success" />
    <Notice message={error} />
    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600"><ClipboardCheck size={18} /></span><div><h2 className="text-sm font-bold text-[#142B4A]">คำขอรอพิจารณา</h2><p className="mt-0.5 text-[11px] text-slate-400">{requests.length} รายการ</p></div></div>
      </div>
      <div className="divide-y divide-slate-100">
        {loading ? [1, 2, 3].map((row) => <div key={row} className="animate-pulse space-y-3 px-5 py-5"><div className="h-4 w-44 rounded bg-slate-100" /><div className="h-3 w-2/3 rounded bg-slate-100" /></div>) : requests.map((request) => <article key={request.id} className="px-5 py-5 transition-colors hover:bg-blue-50/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#142B4A]">{request.requestNumber}</h3><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">รออนุมัติ</span></div>
              <p className="mt-1 text-xs text-slate-500">{request.requester.name} · {request.department.name} · {new Date(request.createdAt).toLocaleString("th-TH")}</p>
              <p className="mt-2 text-sm text-slate-700">{request.purpose}</p>
              <div className="mt-3 flex flex-wrap gap-2">{request.items.map((item) => <span key={item.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600">{item.product.sku} · {item.product.name} <strong className="ml-1 text-slate-800">{item.quantity} {item.product.unit}</strong><span className={`ml-2 ${item.product.stockQuantity < item.quantity ? "text-rose-600" : "text-slate-400"}`}>คงเหลือ {item.product.stockQuantity}</span></span>)}</div>
            </div>
            <div className="flex shrink-0 gap-2 xl:pl-4">
              <button onClick={() => setRejecting(request)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"><X size={15} />ปฏิเสธ</button>
              <button onClick={() => setConfirming(request)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"><Check size={15} />อนุมัติ</button>
            </div>
          </div>
        </article>)}
        {!loading && !requests.length && <div className="px-5 py-16 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check size={20} /></div><p className="mt-3 text-sm font-medium text-slate-600">ไม่มีคำขอรออนุมัติ</p><p className="mt-1 text-xs text-slate-400">คำขอใหม่จะแสดงที่นี่</p></div>}
      </div>
    </section>

    {confirming && <ConfirmDialog title="ยืนยันการอนุมัติ" description={`อนุมัติคำขอ ${confirming.requestNumber} และส่งเข้าคิวรอจ่ายวัสดุใช่หรือไม่?`} confirmLabel="อนุมัติคำขอ" onClose={() => setConfirming(null)} onConfirm={() => decide(confirming, "APPROVED")} busy={busy} />}
    {rejecting && <Modal title={`ปฏิเสธคำขอ ${rejecting.requestNumber}`} onClose={() => { if (!busy) { setRejecting(null); setDecisionNote(""); } }}>
      <Notice message={error} />
      <form onSubmit={(event) => { event.preventDefault(); decide(rejecting, "REJECTED", decisionNote); }} className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">เหตุผลในการปฏิเสธ<textarea required maxLength={500} rows={4} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></label>
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setRejecting(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600">ยกเลิก</button><button disabled={busy} className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "กำลังบันทึก..." : "ยืนยันปฏิเสธ"}</button></div>
      </form>
    </Modal>}
  </div>;
}
