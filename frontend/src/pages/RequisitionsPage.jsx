import { useCallback, useEffect, useState } from "react";
import { Plus, Send, ClipboardList, Package, Search, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";
import Pagination from "../components/Pagination.jsx";

const pageSize = 10;
const statusLabels = {
  PENDING: ["รออนุมัติ", "bg-amber-50 text-amber-700"],
  APPROVED: ["อนุมัติแล้ว · รอจ่าย", "bg-blue-50 text-blue-700"],
  REJECTED: ["ไม่อนุมัติ", "bg-rose-50 text-rose-700"],
  FULFILLED: ["จ่ายแล้ว", "bg-emerald-50 text-emerald-700"]
};

export default function RequisitionsPage() {
  const { user } = useAuth();
  const canRequest = user.role === "USER";
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/requisitions", {
        params: { page, limit: pageSize, status: filter === "all" ? undefined : filter }
      });
      setRequests(data.data);
      setTotal(data.pagination.total);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, filter, reloadKey]);

  useEffect(() => { loadRequests(); }, [loadRequests]);
  useEffect(() => {
    if (!canRequest) return;
    api.get("/products", { params: { limit: 100 } })
      .then(({ data }) => setProducts(data.data))
      .catch((e) => setError(getErrorMessage(e)));
  }, [canRequest]);

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.post("/requisitions", {
        departmentId: user.department.id,
        purpose,
        items: items.map((item) => ({ productId: Number(item.productId), quantity: Number(item.quantity) }))
      });
      setMessage("ส่งคำขอเบิกเพื่อพิจารณาแล้ว");
      setPurpose("");
      setItems([{ productId: "", quantity: 1 }]);
      setFilter("all");
      setPage(1);
      setReloadKey((value) => value + 1);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-5">
    <PageHeader title="เบิกวัสดุ" description={canRequest ? "ส่งคำขอเบิกและติดตามสถานะการอนุมัติ" : "ตรวจสอบคำขอเบิกวัสดุและสถานะการดำเนินการ"} />
    <Notice message={message} type="success" />
    <Notice message={error} />

    {canRequest && <section className="surface-card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Send size={19} /></span>
        <div><h2 className="text-sm font-bold text-[#142B4A]">สร้างคำขอเบิก</h2><p className="mt-0.5 text-xs text-slate-400">ระบบจะส่งให้ผู้ดูแลพิจารณาก่อนจ่ายวัสดุ</p></div>
      </div>
      {!user.department?.id ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">บัญชีนี้ยังไม่ได้กำหนดแผนก กรุณาติดต่อผู้ดูแลระบบก่อนส่งคำขอ</div> : <form onSubmit={submit} className="space-y-4">
        <div className="space-y-3">
          {items.map((item, index) => {
            const selected = products.find((product) => product.id === Number(item.productId));
            return <div key={index} className="grid gap-3 rounded-xl border border-slate-100 bg-[#FBFCFE] p-3 sm:grid-cols-[minmax(0,1fr)_150px_40px] sm:items-end">
              <label className="text-xs font-semibold text-slate-600">วัสดุ
                <select required value={item.productId} onChange={(event) => updateItem(index, "productId", event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700">
                  <option value="">เลือกวัสดุ</option>
                  {products.filter((product) => !items.some((other, otherIndex) => otherIndex !== index && Number(other.productId) === product.id)).map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name} (คงเหลือ {product.stockQuantity} {product.unit})</option>)}
                </select>
                {selected && selected.stockQuantity < Number(item.quantity) && <span className="mt-1 block text-[11px] font-normal text-amber-700">จำนวนขอเบิกมากกว่ายอดคงเหลือปัจจุบัน คำขออาจไม่ได้รับอนุมัติ</span>}
              </label>
              <label className="text-xs font-semibold text-slate-600">จำนวนที่ขอ
                <input required type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700" />
              </label>
              <button type="button" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid h-10 w-10 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label="ลบรายการวัสดุ"><Trash2 size={16} /></button>
            </div>;
          })}
        </div>
        <button type="button" onClick={() => setItems((current) => [...current, { productId: "", quantity: 1 }])} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"><Plus size={15} />เพิ่มวัสดุ</button>
        <label className="block text-xs font-semibold text-slate-600">เหตุผลในการเบิก
          <textarea required maxLength={500} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50" placeholder="ระบุวัตถุประสงค์การใช้งาน" />
        </label>
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">แผนก: <span className="font-semibold text-slate-600">{user.department.name}</span></p>
          <button type="submit" disabled={busy || !products.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">{busy ? "กำลังส่งคำขอ..." : <><Send size={16} />ส่งคำขอเบิก</>}</button>
        </div>
      </form>}
    </section>}

    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><ClipboardList size={18} /></span><div><h2 className="text-sm font-bold text-[#142B4A]">ประวัติคำขอเบิก</h2><p className="mt-0.5 text-[11px] text-slate-400">รายการคำขอและสถานะล่าสุด</p></div></div>
        <div className="flex items-center gap-2">
          <Search size={15} className="text-slate-400" />
          <select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <option value="all">ทุกสถานะ</option><option value="PENDING">รออนุมัติ</option><option value="APPROVED">อนุมัติแล้ว</option><option value="REJECTED">ไม่อนุมัติ</option><option value="FULFILLED">จ่ายแล้ว</option>
          </select>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {loading ? [1, 2, 3].map((row) => <div key={row} className="animate-pulse space-y-3 px-5 py-5"><div className="h-4 w-40 rounded bg-slate-100" /><div className="h-3 w-3/4 rounded bg-slate-100" /></div>) : requests.map((request) => <article key={request.id} className="px-5 py-4 transition-colors hover:bg-blue-50/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-[#142B4A]">{request.requestNumber}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusLabels[request.status][1]}`}>{statusLabels[request.status][0]}</span></div>
              <p className="mt-1 text-xs text-slate-500">{request.requester.name} · {request.department.name} · {new Date(request.createdAt).toLocaleString("th-TH")}</p>
              <p className="mt-2 text-xs text-slate-600">{request.purpose}</p>
              <div className="mt-3 flex flex-wrap gap-2">{request.items.map((item) => <span key={item.id} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600"><Package size={13} className="text-slate-400" />{item.product.name} <strong className="text-slate-800">{item.quantity} {item.product.unit}</strong></span>)}</div>
              {request.decisionNote && <p className="mt-2 text-xs text-rose-600">หมายเหตุผู้พิจารณา: {request.decisionNote}</p>}
            </div>
            {request.decidedBy && <p className="shrink-0 text-[11px] text-slate-400">พิจารณาโดย {request.decidedBy.name}</p>}
          </div>
        </article>)}
        {!loading && !requests.length && <div className="px-5 py-14 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-400"><ClipboardList size={20} /></div><p className="mt-3 text-sm font-medium text-slate-600">ไม่พบคำขอเบิก</p><p className="mt-1 text-xs text-slate-400">เมื่อมีรายการ คำขอจะแสดงในส่วนนี้</p></div>}
      </div>
      <Pagination page={page} total={total} limit={pageSize} onChange={setPage} />
    </section>
  </div>;
}
