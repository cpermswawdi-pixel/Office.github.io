import { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Modal from "../components/Modal.jsx";
import Notice from "../components/Notice.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Pagination from "../components/Pagination.jsx";

const labels = { name: "ชื่อ", abbreviation: "ตัวย่อ", contactPerson: "ผู้ติดต่อ", phone: "โทรศัพท์", email: "อีเมล" };
const initialFor = (fields) => Object.fromEntries(fields.map((field) => [field, ""]));
const pageSize = 10;
export default function MasterPage({ resource, title, fields }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(initialFor(fields));
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try { const { data } = await api.get(`/${resource}`, { params: { search, page, limit: pageSize } }); setItems(data.data); setTotal(data.pagination.total); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [resource, search, page]);
  useEffect(() => { load(); }, [load]);
  const startCreate = () => { setEditing(null); setForm(initialFor(fields)); setError(""); setOpen(true); };
  const startEdit = (item) => { setEditing(item); setForm(Object.fromEntries(fields.map((field) => [field, item[field] || ""]))); setError(""); setOpen(true); };
  const submit = async (event) => {
    event.preventDefault(); setError("");
    try {
      const payload = { ...form };
      if (resource === "suppliers") for (const key of ["contactPerson", "phone", "email"]) if (payload[key] === "") payload[key] = null;
      await (editing ? api.put(`/${resource}/${editing.id}`, payload) : api.post(`/${resource}`, payload));
      setOpen(false); setMessage(editing ? "แก้ไขข้อมูลแล้ว" : "เพิ่มข้อมูลแล้ว"); await load();
    } catch (e) { setError(getErrorMessage(e)); }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/${resource}/${deleting.id}`);
      setMessage("ลบข้อมูลแล้ว");
      setDeleting(null);
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <>
    <PageHeader title={title} description="จัดการข้อมูลอ้างอิงที่ใช้ในระบบคลังสินค้า" action={<button onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />เพิ่มข้อมูล</button>} />
    <Notice message={message} type="success" /><Notice message={error} />
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4"><div className="relative max-w-sm"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหา" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50" /></div></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#F8FAFD] text-xs text-slate-500"><tr>{fields.map((field) => <th key={field} className="px-5 py-3 font-semibold">{labels[field] || field}</th>)}{resource === "categories" && <th className="px-5 py-3 font-semibold">จำนวนสินค้า</th>}<th className="w-24 px-5 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{loading ? [1, 2, 3].map((row) => <tr key={row}>{Array.from({ length: fields.length + (resource === "categories" ? 2 : 1) }, (_, index) => <td key={index} className="px-5 py-5"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>) : items.map((item) => <tr key={item.id} className="transition-colors hover:bg-blue-50/30"><td className="px-5 py-4 font-semibold text-slate-800">{item.name}</td>{fields.slice(1).map((field) => <td key={field} className="px-5 py-4 text-slate-600">{item[field] || "—"}</td>)}{resource === "categories" && <td className="px-5 py-4 text-slate-600">{item._count?.products || 0}</td>}<td className="px-5 py-4"><div className="flex justify-end"><button onClick={() => startEdit(item)} className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="แก้ไข"><Edit3 size={16} /></button><button onClick={() => setDeleting(item)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700" title="ลบ"><Trash2 size={16} /></button></div></td></tr>)}{!loading && !items.length && <tr><td colSpan={fields.length + 2} className="py-14 text-center text-slate-400">ไม่พบข้อมูล</td></tr>}</tbody></table></div>
      <Pagination page={page} total={total} limit={pageSize} onChange={setPage} />
    </section>
    {deleting && <ConfirmDialog title="ยืนยันการลบข้อมูล" description={`ต้องการลบ “${deleting.name}” หรือไม่?`} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} />}
    {open && <Modal title={`${editing ? "แก้ไข" : "เพิ่ม"}${title}`} onClose={() => setOpen(false)}><Notice message={error} /><form onSubmit={submit} className="space-y-4">
      {fields.map((field) => <label key={field} className="block text-sm font-medium text-slate-700">{labels[field] || field}<input required={field === "name"} type={field === "email" ? "email" : "text"} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-500" /></label>)}
      {resource === "suppliers" && <><label className="block text-sm font-medium text-slate-700">ที่อยู่<textarea rows={2} value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label><label className="block text-sm font-medium text-slate-700">หมายเหตุ<textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label></>}
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm">ยกเลิก</button><button className="rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white">บันทึก</button></div>
    </form></Modal>}
  </>;
}
