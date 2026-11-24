import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Edit3, Filter, ImagePlus, Package, Plus, Search, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Modal from "../components/Modal.jsx";
import Notice from "../components/Notice.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import Pagination from "../components/Pagination.jsx";

const empty = { sku: "", barcode: "", name: "", description: "", categoryId: "", unitCatalogId: "", unit: "ชิ้น", costPrice: "", sellingPrice: "", minimumStock: 0, imageUrl: "" };
const fmt = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const pageSize = 10;

export default function ProductsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const canEdit = user.role !== "USER";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [stockFilter, setStockFilter] = useState(() => searchParams.get("stock") || "all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setStockFilter(searchParams.get("stock") || "all");
    setPage(1);
  }, [searchParams]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, c, u] = await Promise.all([
        api.get("/products", { params: { search, stock: stockFilter === "all" ? undefined : stockFilter, categoryId: categoryFilter || undefined, page, limit: pageSize } }),
        api.get("/categories", { params: { limit: 100 } }),
        api.get("/units", { params: { limit: 100 } })
      ]);
      setProducts(p.data.data); setTotal(p.data.pagination.total); setCategories(c.data.data); setUnits(u.data.data);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [search, stockFilter, categoryFilter, page]);
  useEffect(() => { load(); }, [load]);
  const openNew = () => { setEditing(null); setForm({ ...empty, categoryId: categories[0]?.id || "", unitCatalogId: units[0]?.id || "", unit: units[0]?.name || "ชิ้น" }); setError(""); setMessage(""); setModal(true); };
  const openEdit = (product) => { setEditing(product); setForm({ ...product, categoryId: product.categoryId, unitCatalogId: product.unitCatalogId || "", costPrice: product.costPrice, sellingPrice: product.sellingPrice }); setError(""); setModal(true); };
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      let imageUrl = form.imageUrl;
      const file = e.currentTarget.image.files[0];
      if (file) {
        const body = new FormData(); body.append("image", file);
        const upload = await api.post("/uploads/product-image", body);
        imageUrl = upload.data.data.imageUrl;
      }
      const payload = {
        ...form, categoryId: Number(form.categoryId), unitCatalogId: form.unitCatalogId ? Number(form.unitCatalogId) : null, costPrice: Number(form.costPrice), sellingPrice: Number(form.sellingPrice),
        minimumStock: Number(form.minimumStock), barcode: form.barcode || null, description: form.description || null,
        imageUrl: imageUrl || null
      };
      delete payload.category; delete payload.id; delete payload.createdAt; delete payload.updatedAt; delete payload.movements;
      if (editing) delete payload.stockQuantity;
      await (editing ? api.put(`/products/${editing.id}`, payload) : api.post("/products", payload));
      setModal(false); setMessage(editing ? "บันทึกการแก้ไขแล้ว" : "เพิ่มสินค้าแล้ว"); load();
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/products/${deleting.id}`);
      setMessage("ลบสินค้าแล้ว");
      setDeleting(null);
      if (products.length === 1 && page > 1) setPage((current) => current - 1);
      else load();
    }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <>
    <PageHeader title="จัดการสินค้า" description="เพิ่ม แก้ไข และตรวจสอบข้อมูลสินค้าในคลัง" action={canEdit && <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-900"><Plus size={17} />เพิ่มสินค้า</button>} />
    <Notice message={message} type="success" /><Notice message={error} />
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อ SKU หรือ Barcode" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" /></div>
          <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-600 sm:w-44"><option value="">ทุกหมวดหมู่</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"><option value="all">ทุกสถานะ</option><option value="low">ใกล้หมด</option><option value="out">สินค้าหมด</option></select>
        </div>
        <p className="text-xs text-slate-500">ทั้งหมด <strong className="text-slate-700">{fmt.format(total)}</strong> รายการ</p>
      </div>
      <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["สินค้า", "SKU / Barcode", "หมวดหมู่", "คงเหลือ", "ราคาทุน", "ราคาขาย", ...(canEdit ? [""] : [])].map((h, i) => <th key={`${h}-${i}`} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
        {loading ? [1, 2, 3].map((row) => <tr key={row}>{Array.from({ length: canEdit ? 7 : 6 }, (_, index) => <td key={index} className="px-5 py-5"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>) : products.map((p) => <tr key={p.id} className="transition-colors hover:bg-blue-50/30"><td className="px-5 py-3.5"><div className="flex items-center gap-3">{p.imageUrl ? <img src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:4000"}${p.imageUrl}`} className="h-10 w-10 rounded-lg object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-500"><ImagePlus size={18} /></div>}<div><p className="font-semibold text-slate-800">{p.name}</p><p className="text-xs text-slate-400">{p.unit}</p></div></div></td><td className="px-5 py-3.5"><p className="font-medium text-slate-700">{p.sku}</p><p className="text-xs text-slate-400">{p.barcode || "—"}</p></td><td className="px-5 py-3.5 text-slate-600">{p.category.name}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.stockQuantity === 0 ? "bg-rose-50 text-rose-700" : p.stockQuantity <= p.minimumStock ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{fmt.format(p.stockQuantity)} {p.unit}</span></td><td className="px-5 py-3.5 text-slate-600">{fmt.format(Number(p.costPrice))}</td><td className="px-5 py-3.5 text-slate-600">{fmt.format(Number(p.sellingPrice))}</td>{canEdit && <td className="px-5 py-3.5"><div className="flex gap-1"><button onClick={() => openEdit(p)} className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700" title="แก้ไข"><Edit3 size={16} /></button><button onClick={() => setDeleting(p)} className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700" title="ลบ"><Trash2 size={16} /></button></div></td>}</tr>)}
        {!loading && !products.length && <tr><td colSpan={canEdit ? 7 : 6} className="py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400"><Package size={22} /></div><p className="mt-3 text-sm font-medium text-slate-600">ไม่พบข้อมูลสินค้า</p><p className="mt-1 text-xs text-slate-400">ลองปรับคำค้นหาหรือตัวกรองของคุณ</p></td></tr>}
      </tbody></table></div>
      <Pagination page={page} total={total} limit={pageSize} onChange={setPage} />
    </section>
    {deleting && <ConfirmDialog title="ยืนยันการลบสินค้า" description={`ต้องการลบสินค้า “${deleting.name}” หรือไม่?`} onClose={() => setDeleting(null)} onConfirm={remove} busy={busy} />}
    {modal && <Modal title={editing ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"} onClose={() => setModal(false)}><Notice message={error} /><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {[["sku", "รหัส SKU", "text", true], ["barcode", "Barcode", "text"], ["name", "ชื่อสินค้า", "text", true], ["costPrice", "ราคาทุน", "number", true], ["sellingPrice", "ราคาขาย", "number", true], ["minimumStock", "จำนวนขั้นต่ำ", "number", true]].map(([key, label, type, required]) => <label key={key} className="text-sm font-medium text-slate-700">{label}<input required={required} min={type === "number" ? 0 : undefined} step={type === "number" && key.includes("Price") ? ".01" : "1"} type={type} value={form[key] ?? ""} onChange={(e) => update(key, e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-500" /></label>)}
      <label className="text-sm font-medium text-slate-700">หมวดหมู่<select required value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">เลือกหมวดหมู่</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">หน่วยนับ<select required value={form.unitCatalogId} onChange={(e) => { const selected = units.find((unit) => unit.id === Number(e.target.value)); update("unitCatalogId", e.target.value); if (selected) update("unit", selected.name); }} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">เลือกหน่วยนับ</option>{units.filter((unit) => unit.isActive || unit.id === Number(form.unitCatalogId)).map((unit) => <option key={unit.id} value={unit.id}>{unit.name}{unit.abbreviation ? ` (${unit.abbreviation})` : ""}</option>)}</select></label>
      <label className="text-sm font-medium text-slate-700">รูปสินค้า<input name="image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-1.5 block w-full text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sky-700" /></label>
      <label className="text-sm font-medium text-slate-700 sm:col-span-2">รายละเอียด<textarea rows="3" value={form.description || ""} onChange={(e) => update("description", e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-sky-500" /></label>
      {!editing && <p className="text-xs text-slate-500 sm:col-span-2">ตั้งยอดเริ่มต้นเป็น 0; บันทึกยอดผ่านรายการรับเข้าคลังเพื่อให้ตรวจสอบย้อนหลังได้</p>}
      <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={() => setModal(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm">ยกเลิก</button><button disabled={busy} className="rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "กำลังบันทึก..." : "บันทึก"}</button></div>
    </form></Modal>}
  </>;
}
