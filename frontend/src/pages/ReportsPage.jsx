import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Search } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ReportsPage() {
  const { user } = useAuth();
  const [type, setType] = useState("stock");
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [movementType, setMovementType] = useState("all");
  const [categories, setCategories] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get("/categories", { params: { limit: 100 } })
      .then(({ data }) => setCategories(data.data))
      .catch((e) => setError(getErrorMessage(e)));
  }, []);
  const load = async () => {
    setError("");
    try {
      const url = type === "stock" ? "/reports/stock" : "/reports/movements";
      const { data } = await api.get(url, { params: {
        search: search || undefined,
        stock: type === "stock" && stock !== "all" ? stock : undefined,
        categoryId: type === "stock" ? categoryId || undefined : undefined,
        from: type === "movements" ? from || undefined : undefined,
        to: type === "movements" ? to || undefined : undefined,
        type: type === "movements" && movementType !== "all" ? movementType : undefined
      } });
      setRows(data.data);
    } catch (e) { setError(getErrorMessage(e)); }
  };
  useEffect(() => { load(); }, [type, stock, categoryId, from, to, movementType]);
  const exportFile = async (format) => {
    setBusy(true); setError("");
    try {
      const response = await api.get(`/reports/export/${format}`, {
        params: {
          report: type,
          search: search || undefined,
          stock: type === "stock" && stock !== "all" ? stock : undefined,
          categoryId: type === "stock" ? categoryId || undefined : undefined,
          from: type === "movements" ? from || undefined : undefined,
          to: type === "movements" ? to || undefined : undefined,
          movementType: type === "movements" && movementType !== "all" ? movementType : undefined
        },
        responseType: "blob"
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url; link.download = `wms-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <>
    <PageHeader title="รายงานคลังสินค้า" description="ค้นหาและส่งออกรายงานจากข้อมูลจริงในระบบ" action={<div className="flex flex-wrap gap-2"><button disabled={busy || !["SUPER_ADMIN", "ADMIN"].includes(user.role)} onClick={() => exportFile("xlsx")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FileSpreadsheet size={16} />Excel</button><button disabled={busy || !["SUPER_ADMIN", "ADMIN"].includes(user.role)} onClick={() => exportFile("csv")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download size={16} />CSV</button><button disabled={busy || !["SUPER_ADMIN", "ADMIN"].includes(user.role)} onClick={() => exportFile("pdf")} className="inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2.5 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-50"><FileText size={16} />PDF</button></div>} />
    <Notice message={error} />
    <section className="mb-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="text-xs font-medium text-slate-500">ประเภทรายงาน<select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="stock">สินค้าคงเหลือ</option><option value="movements">รับเข้า / เบิกออก</option></select></label>
        {type === "stock" ? <><label className="text-xs font-medium text-slate-500">สถานะสต็อก<select value={stock} onChange={(e) => setStock(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="all">ทั้งหมด</option><option value="low">ใกล้หมด</option><option value="out">สินค้าหมด</option></select></label><label className="text-xs font-medium text-slate-500">หมวดหมู่<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="">ทุกหมวดหมู่</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></> : <><label className="text-xs font-medium text-slate-500">ประเภทรายการ<select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"><option value="all">ทั้งหมด</option><option value="STOCK_IN">รับเข้า</option><option value="STOCK_OUT">เบิกออก</option></select></label><label className="text-xs font-medium text-slate-500">ตั้งแต่วันที่<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-medium text-slate-500">ถึงวันที่<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label></>}
        <label className="text-xs font-medium text-slate-500 xl:col-span-2">ค้นหา<input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="ชื่อสินค้า หรือ SKU" className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" /></label>
        <div className="flex items-end"><button onClick={load} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium hover:bg-slate-50"><Search size={16} />ค้นหา</button></div>
      </div>
      {!["SUPER_ADMIN", "ADMIN"].includes(user.role) && <p className="mt-3 text-xs text-slate-500">การส่งออกรายงานให้สิทธิ์เฉพาะ Admin</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><p className="text-sm font-semibold text-slate-800">ผลลัพธ์ <span className="font-normal text-slate-400">({rows.length})</span></p></div>
      <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{(type === "stock" ? ["SKU", "สินค้า", "หมวดหมู่", "คงเหลือ", "ขั้นต่ำ", "ราคาทุน", "มูลค่า"] : ["วันที่", "ประเภท", "สินค้า", "จำนวน", "เอกสาร", "ผู้ทำรายการ", "ผู้บันทึก"]).map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
        {rows.map((r) => type === "stock" ? <tr key={r.id}><td className="px-4 py-3 font-medium text-slate-700">{r.sku}</td><td className="px-4 py-3 text-slate-800">{r.name}</td><td className="px-4 py-3 text-slate-500">{r.category.name}</td><td className="px-4 py-3">{r.stockQuantity}</td><td className="px-4 py-3">{r.minimumStock}</td><td className="px-4 py-3">{Number(r.costPrice).toLocaleString("th-TH")}</td><td className="px-4 py-3 font-medium">{Number(r.inventoryValue).toLocaleString("th-TH")}</td></tr> : <tr key={r.id}><td className="px-4 py-3 text-slate-500">{new Date(r.movementDate).toLocaleDateString("th-TH")}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${r.type === "STOCK_IN" ? "bg-sky-50 text-sky-700" : "bg-orange-50 text-orange-700"}`}>{r.type === "STOCK_IN" ? "รับเข้า" : "เบิกออก"}</span></td><td className="px-4 py-3"><p className="text-slate-800">{r.product.name}</p><p className="text-xs text-slate-400">{r.product.sku}</p></td><td className="px-4 py-3 font-semibold">{r.quantity}</td><td className="px-4 py-3 text-slate-500">{r.documentNumber || "—"}</td><td className="px-4 py-3 text-slate-600">{r.requesterName || "—"}</td><td className="px-4 py-3 text-slate-600">{r.createdBy.name}</td></tr>)}
        {!rows.length && <tr><td colSpan={7} className="py-14 text-center text-slate-400">ไม่พบข้อมูลตามเงื่อนไข</td></tr>}
      </tbody></table></div>
    </section>
  </>;
}
