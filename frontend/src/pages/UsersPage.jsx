import { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Search, UserRound, UserRoundX } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Modal from "../components/Modal.jsx";
import Notice from "../components/Notice.jsx";
import Pagination from "../components/Pagination.jsx";

const blank = { name: "", email: "", password: "", role: "USER", departmentId: "" };
const pageSize = 10;
const roleLabels = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", STAFF: "เจ้าหน้าที่คลัง (เดิม)", WAREHOUSE_STAFF: "เจ้าหน้าที่คลัง", USER: "User" };
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, d] = await Promise.all([api.get("/users", { params: { search, page, limit: pageSize } }), api.get("/departments", { params: { limit: 100 } })]);
      setUsers(u.data.data); setTotal(u.data.pagination.total); setDepartments(d.data.data);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [search, page]);
  useEffect(() => { load(); }, [load]);
  const create = async (e) => {
    e.preventDefault(); setError("");
    try {
      const payload = { ...form, departmentId: form.departmentId ? Number(form.departmentId) : null };
      if (editing) {
        delete payload.password;
        if (editing.role.name === "SUPER_ADMIN") delete payload.role;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        await api.post("/users", payload);
      }
      setOpen(false); setForm(blank); setEditing(null); setMessage(editing ? "แก้ไขบัญชีผู้ใช้แล้ว" : "สร้างบัญชีผู้ใช้แล้ว"); await load();
    } catch (e) { setError(getErrorMessage(e)); }
  };
  const toggle = async (user) => {
    try {
      await api.patch(`/users/${user.id}/status`, { active: !user.active });
      setMessage(user.active ? "ปิดใช้งานบัญชีแล้ว" : "เปิดใช้งานบัญชีแล้ว"); await load();
    } catch (e) { setError(getErrorMessage(e)); }
  };
  return <>
    <PageHeader title="จัดการผู้ใช้งาน" description="กำหนดสิทธิ์ Admin, เจ้าหน้าที่คลัง และ User" action={<button onClick={() => { setEditing(null); setForm(blank); setError(""); setOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />เพิ่มผู้ใช้</button>} />
    <Notice message={message} type="success" /><Notice message={error} />
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4"><div className="relative max-w-sm"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อหรืออีเมล" className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-50" /></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#F8FAFD] text-xs text-slate-500"><tr>{["ผู้ใช้งาน", "สิทธิ์", "แผนก", "สถานะ", "วันที่สร้าง", ""].map((x, i) => <th key={`${x}-${i}`} className="px-5 py-3 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{loading ? [1, 2, 3].map((row) => <tr key={row}>{Array.from({ length: 6 }, (_, index) => <td key={index} className="px-5 py-5"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>) : users.map((u) => <tr key={u.id} className="transition-colors hover:bg-blue-50/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-700"><UserRound size={17} /></span><div><p className="font-semibold text-slate-800">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div></div></td><td className="px-5 py-4 text-slate-600">{roleLabels[u.role.name] || u.role.name}</td><td className="px-5 py-4 text-slate-600">{u.department?.name || "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{u.active ? "ใช้งาน" : "ปิดใช้งาน"}</span></td><td className="px-5 py-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString("th-TH")}</td><td className="px-5 py-4 text-right"><div className="flex justify-end">{u.role.name !== "SUPER_ADMIN" && <><button onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, password: "", role: u.role.name, departmentId: u.department?.id || "" }); setError(""); setOpen(true); }} className="rounded-lg p-2 text-blue-700 transition hover:bg-blue-50" title="แก้ไข"><Edit3 size={17} /></button><button onClick={() => toggle(u)} className={`rounded-lg p-2 ${u.active ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}`} title={u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}>{u.active ? <UserRoundX size={17} /> : <UserRound size={17} />}</button></>}</div></td></tr>)}{!loading && !users.length && <tr><td colSpan="6" className="py-14 text-center text-slate-400">ไม่พบผู้ใช้</td></tr>}</tbody></table></div>
      <Pagination page={page} total={total} limit={pageSize} onChange={setPage} />
    </section>
    {open && <Modal title={editing ? "แก้ไขบัญชีผู้ใช้งาน" : "สร้างบัญชีผู้ใช้งาน"} onClose={() => setOpen(false)}><Notice message={error} /><form onSubmit={create} className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">ชื่อ<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
      <label className="block text-sm font-medium text-slate-700">อีเมล<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
      {!editing && <label className="block text-sm font-medium text-slate-700">รหัสผ่านเริ่มต้น (อย่างน้อย 10 ตัว มีตัวใหญ่และตัวเลข)<input required type="password" minLength="10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>}
      {editing?.role.name === "SUPER_ADMIN" ? <p className="text-sm text-slate-500">สิทธิ์: Super Admin (ไม่สามารถเปลี่ยนผ่านหน้าจอนี้)</p> : <label className="block text-sm font-medium text-slate-700">สิทธิ์<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="USER">User — ดูข้อมูลและส่งคำขอเบิก</option><option value="WAREHOUSE_STAFF">เจ้าหน้าที่คลัง — รับและจ่ายวัสดุ</option><option value="STAFF">เจ้าหน้าที่คลัง (บัญชีเดิม)</option><option value="ADMIN">Admin — จัดการระบบและอนุมัติคำขอ</option></select></label>}
      <label className="block text-sm font-medium text-slate-700">แผนก{form.role === "USER" && <span className="ml-1 text-rose-500">*</span>}<select required={form.role === "USER"} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">ไม่ระบุ</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm">ยกเลิก</button><button className="rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white">{editing ? "บันทึก" : "สร้างบัญชี"}</button></div>
    </form></Modal>}
  </>;
}
