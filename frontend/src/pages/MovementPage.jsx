import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Search } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";

const today = () => new Date().toISOString().slice(0, 10);
const makeReference = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function MovementPage({ type }) {
  const { user } = useAuth();
  const isIn = type === "in";
  const title = isIn ? "รับสินค้าเข้าคลัง" : "เบิกสินค้าออกจากคลัง";
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ productId: "", quantity: "", unitCost: "", movementDate: today(), supplierId: "", departmentId: "", requesterName: "", purpose: "", documentNumber: "", notes: "" });
  const [referenceKey, setReferenceKey] = useState(makeReference);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [p, m, d, history] = await Promise.all([
        api.get("/products", { params: { limit: 100 } }),
        api.get("/suppliers", { params: { limit: 100 } }),
        api.get("/departments", { params: { limit: 100 } }),
        api.get("/movements", { params: { type: isIn ? "STOCK_IN" : "STOCK_OUT", limit: 30 } })
      ]);
      setProducts(p.data.data); setSuppliers(m.data.data); setDepartments(d.data.data); setRows(history.data.data);
      setForm((prev) => ({ ...prev, productId: prev.productId || p.data.data[0]?.id || "", supplierId: prev.supplierId || m.data.data[0]?.id || "", departmentId: prev.departmentId || user.department?.id || d.data.data[0]?.id || "" }));
    } catch (e) { setError(getErrorMessage(e)); }
  };
  useEffect(() => { load(); }, [isIn]);
  const chosen = useMemo(() => products.find((item) => item.id === Number(form.productId)), [products, form.productId]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await api.post(`/movements/${type}`, {
        productId: Number(form.productId),
        quantity: Number(form.quantity),
        unitCost: isIn && form.unitCost !== "" ? Number(form.unitCost) : undefined,
        movementDate: new Date(`${form.movementDate}T12:00:00`).toISOString(),
        documentNumber: form.documentNumber || null,
        supplierId: isIn ? Number(form.supplierId) : null,
        departmentId: isIn ? null : Number(form.departmentId),
        requesterName: isIn ? null : form.requesterName,
        purpose: isIn ? null : form.purpose,
        notes: form.notes || null,
        referenceKey
      });
      setMessage(isIn ? "บันทึกรับสินค้าและเพิ่มยอดคงเหลือแล้ว" : "บันทึกการเบิกและตัดยอดคงเหลือแล้ว");
      setForm((prev) => ({ ...prev, quantity: "", unitCost: "", documentNumber: "", requesterName: "", purpose: "", notes: "", movementDate: today() }));
      setReferenceKey(makeReference());
      await load();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };
  const visibleRows = rows.filter((row) => `${row.product.name} ${row.product.sku} ${row.documentNumber || ""}`.toLowerCase().includes(filter.toLowerCase()));
  return <>
    <PageHeader title={title} description={isIn ? "ลงทะเบียนสินค้าที่ได้รับและอัปเดตยอดคงเหลืออัตโนมัติ" : "ลงทะเบียนการเบิก พร้อมตรวจสอบยอดคงเหลือก่อนตัดสต็อก"} />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(350px,.85fr)_1.5fr]">
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${isIn ? "bg-sky-50 text-sky-700" : "bg-orange-50 text-orange-700"}`}>{isIn ? <ArrowDownToLine size={20} /> : <ArrowUpFromLine size={20} />}</span><div><h2 className="font-semibold text-slate-900">บันทึกรายการใหม่</h2><p className="text-xs text-slate-500">ข้อมูลจะบันทึกพร้อมประวัติผู้ทำรายการ</p></div></div>
        <Notice message={message} type="success" /><Notice message={error} />
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">สินค้า<select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">เลือกสินค้า</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name} (คงเหลือ {p.stockQuantity})</option>)}</select></label>
          {chosen && <div className={`rounded-lg px-3 py-2 text-sm ${!isIn && Number(form.quantity) > chosen.stockQuantity ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"}`}>คงเหลือปัจจุบัน: <strong>{chosen.stockQuantity} {chosen.unit}</strong>{!isIn && chosen.stockQuantity === 0 && " · สินค้าหมด"}</div>}
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-slate-700">จำนวน<input type="number" required min="1" step="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label><label className="text-sm font-medium text-slate-700">วันที่ทำรายการ<input type="date" required value={form.movementDate} onChange={(e) => setForm({ ...form, movementDate: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label></div>
          {isIn && <label className="block text-sm font-medium text-slate-700">ราคาทุนต่อหน่วย<input type="number" min="0" step="0.01" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" placeholder="ไม่ระบุหากใช้ราคาทุนสินค้าปัจจุบัน" /></label>}
          {isIn ? <label className="block text-sm font-medium text-slate-700">ผู้จำหน่าย<select required value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">เลือกผู้จำหน่าย</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label> : <>
            <label className="block text-sm font-medium text-slate-700">ผู้เบิก<input required value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
            <label className="block text-sm font-medium text-slate-700">แผนก<select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">เลือกแผนก</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <label className="block text-sm font-medium text-slate-700">วัตถุประสงค์<input required value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
          </>}
          <label className="block text-sm font-medium text-slate-700">เลขที่เอกสาร<input value={form.documentNumber} onChange={(e) => setForm({ ...form, documentNumber: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-slate-700">หมายเหตุ<textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
          <button disabled={busy || (!isIn && chosen && Number(form.quantity) > chosen.stockQuantity)} className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white disabled:opacity-50 ${isIn ? "bg-sky-700 hover:bg-sky-800" : "bg-navy-950 hover:bg-navy-900"}`}>{busy ? "กำลังบันทึก..." : <>{isIn ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}{isIn ? "ยืนยันรับสินค้า" : "ยืนยันเบิกสินค้า"}</>}</button>
        </form>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">ประวัติ{isIn ? "รับเข้า" : "เบิกออก"}ล่าสุด</h2><p className="mt-1 text-xs text-slate-500">รายการที่ผู้ใช้มีสิทธิ์ตรวจสอบ</p></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="ค้นหารายการ" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm sm:w-56" /></div><button onClick={load} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="รีเฟรช"><RefreshCw size={17} /></button></div></div>
        <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["วันที่", "สินค้า", "จำนวน", isIn ? "ผู้จำหน่าย" : "ผู้เบิก / แผนก", "เอกสาร", "ผู้บันทึก"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visibleRows.map((r) => <tr key={r.id}><td className="px-4 py-3 text-slate-500">{new Date(r.movementDate).toLocaleDateString("th-TH")}</td><td className="px-4 py-3"><p className="font-medium text-slate-800">{r.product.name}</p><p className="text-xs text-slate-400">{r.product.sku}</p></td><td className={`px-4 py-3 font-semibold ${isIn ? "text-sky-700" : "text-orange-700"}`}>{isIn ? "+" : "-"}{r.quantity}</td><td className="px-4 py-3 text-slate-600">{isIn ? r.supplier?.name : `${r.requesterName || "—"} / ${r.department?.name || "—"}`}</td><td className="px-4 py-3 text-slate-500">{r.documentNumber || "—"}</td><td className="px-4 py-3 text-slate-600">{r.createdBy.name}</td></tr>)}{!visibleRows.length && <tr><td colSpan="6" className="py-12 text-center text-slate-400">ยังไม่มีรายการ</td></tr>}</tbody></table></div>
      </section>
    </div>
  </>;
}
