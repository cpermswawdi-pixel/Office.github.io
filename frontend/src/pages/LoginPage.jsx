import { useState } from "react";
import {
  ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole,
  Mail, PackageCheck, ShieldCheck, Sparkles
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";
import Notice from "../components/Notice.jsx";
import { COLLEGE_LOGO, COLLEGE_NAME, SYSTEM_LOGO, SYSTEM_NAME } from "../branding.js";

const shelfBoxes = [
  "left-5 top-6 h-10 w-12 bg-blue-300/90",
  "left-[4.5rem] top-5 h-11 w-14 bg-sky-200/90",
  "left-[8.5rem] top-7 h-9 w-12 bg-indigo-300/90",
  "left-[12rem] top-5 h-11 w-14 bg-blue-200/90",
  "left-8 top-[5.2rem] h-11 w-14 bg-indigo-200/90",
  "left-[6.5rem] top-[5.4rem] h-9 w-12 bg-blue-200/90",
  "left-[10rem] top-[5.1rem] h-11 w-14 bg-sky-300/90",
  "left-[14rem] top-[5.4rem] h-9 w-12 bg-indigo-300/90"
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,.92fr)]">
    <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[#142B4A] px-10 py-9 text-white lg:flex xl:px-14 xl:py-11">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-40 h-[540px] w-[540px] rounded-full border border-white/[.08]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-[380px] w-[380px] rounded-full border border-white/[.08]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-36 h-[460px] w-[460px] rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <img src={SYSTEM_LOGO} alt="" className="h-12 w-12 shrink-0 rounded-full bg-white object-cover shadow-lg shadow-black/10 ring-2 ring-white/80" />
        <img src={COLLEGE_LOGO} alt="" className="h-10 w-10 shrink-0 rounded-full border border-white/60 bg-white object-contain p-0.5 shadow-lg shadow-black/10" />
        <div>
          <p className="max-w-[360px] text-[13px] font-bold leading-5 text-white">{SYSTEM_NAME}</p>
          <p className="mt-0.5 text-[10px] font-medium text-blue-200">{COLLEGE_NAME}</p>
        </div>
      </div>

      <div className="relative mt-14 max-w-xl xl:mt-[4.5rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-white/[.07] px-3 py-1.5 text-[11px] font-medium tracking-wide text-blue-100">
          <Sparkles size={14} className="text-sky-300" /> คลังสินค้า จัดการได้อย่างมั่นใจ
        </span>
        <h1 className="mt-6 text-[clamp(2.5rem,4vw,3.8rem)] font-bold leading-[1.2] tracking-tight">
          ทุกการเคลื่อนไหว<br />
          <span className="text-[#8FC5FF]">ชัดเจนในที่เดียว</span>
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-7 text-blue-100/75">
          ดูแลสินค้า รับเข้า เบิกจ่าย และติดตามสถานะคลังได้อย่างเป็นระบบ พร้อมข้อมูลที่ตรวจสอบย้อนหลังได้
        </p>
      </div>

      <div aria-hidden="true" className="relative mt-auto min-h-[280px] pt-9 xl:min-h-[330px]">
        <div className="absolute bottom-4 left-5 right-4 top-4 rounded-[28px] border border-white/[.12] bg-white/[.045] shadow-2xl shadow-slate-950/10" />
        <div className="absolute bottom-0 left-0 right-0 top-0 overflow-hidden rounded-[26px]">
          <div className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="absolute left-9 right-10 top-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-sky-200"><PackageCheck size={18} /></span>
              <div><p className="text-xs font-semibold text-white/90">ระบบคลังสินค้า</p><p className="mt-0.5 text-[10px] text-blue-100/55">จัดการทุกขั้นตอนในระบบเดียว</p></div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-medium text-emerald-100"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />พร้อมใช้งาน</span>
          </div>
          <div className="absolute bottom-8 left-9 right-10 top-[88px]">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/15" />
            <div className="absolute inset-x-0 top-[72px] h-[1px] bg-white/15" />
            <div className="absolute inset-x-0 top-[144px] h-[1px] bg-white/15" />
            <div className="absolute bottom-0 left-0 top-0 w-2 rounded-sm bg-white/15" />
            <div className="absolute bottom-0 right-0 top-0 w-2 rounded-sm bg-white/15" />
            <div className="absolute bottom-0 left-1/2 top-0 w-1.5 -translate-x-1/2 bg-white/10" />
            {shelfBoxes.map((position, index) => <div key={index} className={`absolute ${position} rounded-md border border-white/20 shadow-md shadow-blue-950/10`}>
              <span className="absolute inset-x-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-white/25" />
            </div>)}
          </div>
          <div className="absolute bottom-5 right-8 flex items-center gap-2 rounded-xl border border-white/10 bg-[#18385B]/90 px-3 py-2 shadow-lg backdrop-blur">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-300/15 text-sky-200"><ShieldCheck size={15} /></span>
            <span className="text-[10px] font-medium text-blue-50/85">ข้อมูลและสิทธิ์เข้าถึงอย่างปลอดภัย</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 pt-5 text-[10px] text-blue-100/55">
        <span>{COLLEGE_NAME}</span>
        <span className="flex items-center gap-1.5"><Check size={12} /> ปลอดภัย · ตรวจสอบได้</span>
      </div>
    </section>

    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10 sm:px-8 lg:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-blue-50 lg:hidden" />
      <div className="relative w-full max-w-[430px]">
        <div className="mb-10 flex min-w-0 items-center gap-2 lg:hidden">
          <img src={SYSTEM_LOGO} alt="" className="h-10 w-10 shrink-0 rounded-full bg-white object-cover shadow-sm ring-1 ring-slate-200" />
          <img src={COLLEGE_LOGO} alt={COLLEGE_NAME} className="h-8 w-8 shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200" />
          <div className="min-w-0"><p className="text-[11px] font-bold leading-4 text-[#142B4A]">{SYSTEM_NAME}</p><p className="mt-0.5 truncate text-[9px] font-medium text-blue-600">{COLLEGE_NAME}</p></div>
        </div>

        <div className="mb-7">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700"><span className="h-1.5 w-1.5 rounded-full bg-blue-600" /> ยินดีต้อนรับกลับ</span>
          <h2 className="mt-2 text-[32px] font-bold tracking-tight text-[#142B4A]">เข้าสู่ระบบ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">กรอกข้อมูลบัญชีเพื่อเข้าใช้งานระบบเบิก‑จ่ายวัสดุสำนักงาน</p>
        </div>

        <form onSubmit={submit} className="rounded-[22px] border border-slate-100 bg-white p-5 shadow-[0_20px_60px_-32px_rgba(20,43,74,.22)] sm:p-7">
          <Notice message={error} />

          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">อีเมล</label>
          <div className="mb-5 flex h-[50px] items-center gap-2.5 rounded-xl border border-slate-200 bg-[#FBFCFE] px-3.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
            <Mail size={18} className="shrink-0 text-slate-400" />
            <input id="login-email" required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(error)} className="h-full w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="name@company.com" />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">รหัสผ่าน</label>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400"><LockKeyhole size={12} /> ปลอดภัย</span>
          </div>
          <div className="mb-6 flex h-[50px] items-center gap-2.5 rounded-xl border border-slate-200 bg-[#FBFCFE] px-3.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
            <KeyRound size={18} className="shrink-0 text-slate-400" />
            <input id="login-password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(error)} className="h-full w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="กรอกรหัสผ่าน" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button type="submit" disabled={busy} className="group flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#142B4A] px-4 text-sm font-semibold text-white shadow-lg shadow-[#142B4A]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1B3A61] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70">
            {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />กำลังเข้าสู่ระบบ...</> : <>เข้าสู่ระบบ<ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" /></>}
          </button>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-400">บัญชีเริ่มต้นตั้งค่าผ่านคำสั่ง seed ของผู้ดูแลระบบ</p>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400"><ShieldCheck size={14} className="text-emerald-600" /> การเข้าสู่ระบบได้รับการปกป้องด้วยการยืนยันตัวตน</div>
      </div>
    </section>
  </main>;
}
