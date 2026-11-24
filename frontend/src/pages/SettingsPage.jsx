import { useState } from "react";
import { KeyRound } from "lucide-react";
import { api, getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setError(""); setMessage("");
    if (form.newPassword !== form.confirmPassword) return setError("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
    setBusy(true);
    try {
      await api.put("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setMessage("เปลี่ยนรหัสผ่านสำเร็จ"); setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <>
    <PageHeader title="ตั้งค่าบัญชี" description="จัดการความปลอดภัยและรหัสผ่านของคุณ" />
    <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-700"><KeyRound /></div><h2 className="text-lg font-semibold text-slate-900">ข้อมูลบัญชี</h2><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">ชื่อ</dt><dd className="mt-1 font-medium text-slate-800">{user.name}</dd></div><div><dt className="text-slate-500">อีเมล</dt><dd className="mt-1 font-medium text-slate-800">{user.email}</dd></div><div><dt className="text-slate-500">สิทธิ์</dt><dd className="mt-1 font-medium text-slate-800">{user.role}</dd></div></dl></section>
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2><p className="mt-1 mb-5 text-sm text-slate-500">ใช้รหัสผ่านอย่างน้อย 10 ตัวอักษร มีตัวพิมพ์ใหญ่และตัวเลข</p><Notice message={message} type="success" /><Notice message={error} />
        <form onSubmit={submit} className="max-w-lg space-y-4">
          {[["currentPassword", "รหัสผ่านปัจจุบัน"], ["newPassword", "รหัสผ่านใหม่"], ["confirmPassword", "ยืนยันรหัสผ่านใหม่"]].map(([key, label]) => <label key={key} className="block text-sm font-medium text-slate-700">{label}<input required type="password" minLength={key === "currentPassword" ? 8 : 10} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>)}
          <button disabled={busy} className="rounded-lg bg-navy-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}</button>
        </form>
      </section>
    </div>
  </>;
}
