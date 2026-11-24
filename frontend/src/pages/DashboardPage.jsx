import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowDownToLine, ArrowUpFromLine, Boxes, CircleAlert, Coins,
  Package, RefreshCw, TrendingDown, TrendingUp, ArrowRight, CalendarDays
} from "lucide-react";
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import { api, getErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Notice from "../components/Notice.jsx";

const currency = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("th-TH");
const cardSpecs = [
  { key: "totalProducts", label: "สินค้าทั้งหมด", icon: Package, tint: "blue", trendKey: "productsAdded" },
  { key: "totalStock", label: "จำนวนคงเหลือ", icon: Boxes, tint: "green" },
  { key: "lowStock", label: "สินค้าใกล้หมด", icon: CircleAlert, tint: "amber", link: "/products?stock=low" },
  { key: "outOfStock", label: "สินค้าหมดคลัง", icon: CircleAlert, tint: "red", link: "/products?stock=out" },
  { key: "monthlyRequests", label: "คำขอเบิกใน 30 วัน", icon: ArrowUpFromLine, tint: "sky", trendKey: "requests" },
  { key: "inventoryValue", label: "มูลค่าสินค้าคงคลัง", icon: Coins, tint: "violet" }
];

function Trend({ value }) {
  if (!value) return null;
  const isNew = value.percent === null && value.current > 0;
  const isUp = (value.percent ?? 0) >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${isNew ? "bg-blue-50 text-blue-700" : isUp ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
    {!isNew && <Icon size={12} />}{isNew ? "เริ่มมีรายการ" : `${Math.abs(value.percent)}%`}<span className="font-normal text-current/70">30 วัน</span>
  </span>;
}

function DashboardSkeleton() {
  return <div className="animate-pulse space-y-6">
    <div className="h-36 rounded-2xl bg-slate-200/70" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-white shadow-sm" />)}</div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]"><div className="h-[340px] rounded-2xl bg-white shadow-sm" /><div className="h-[340px] rounded-2xl bg-white shadow-sm" /></div>
  </div>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/dashboard");
      setData(response.data.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  if (loading && !data) return <DashboardSkeleton />;
  if (!data) return <div className="surface-card p-6 sm:p-8">
    <div className="mx-auto max-w-md text-center">
      <Notice message={error} />
      <p className="mt-4 text-sm text-slate-500">ไม่สามารถโหลดข้อมูลภาพรวมจากระบบได้</p>
      <button onClick={load} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#142B4A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />ลองอีกครั้ง</button>
    </div>
  </div>;
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-[22px] border border-blue-100 bg-[#EAF2FF] px-5 py-5 sm:px-7 md:py-6">
      <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border-[34px] border-white/60" />
      <div className="pointer-events-none absolute right-40 top-16 hidden h-24 w-24 rounded-full bg-blue-100/70 md:block" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700"><span className="text-xl">👋</span> ยินดีต้อนรับกลับเข้าสู่ระบบ</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#142B4A] sm:text-[28px]">{user?.name || "ผู้ใช้งาน"}</h1>
          <p className="mt-1 text-sm text-slate-500">ภาพรวมการเบิกจ่ายและสถานะคลังสินค้าของคุณ</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-xl border border-white/80 bg-white/80 px-3.5 py-2.5 text-xs font-medium text-slate-600 shadow-sm sm:self-auto">
          <CalendarDays size={16} className="text-blue-600" />
          {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
    </div>

    <Notice message={error} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cardSpecs.map(({ key, label, icon: Icon, tint, trendKey, link }) => {
        const content = <div className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${key === "lowStock" && data.cards[key] > 0 ? "border-amber-200" : key === "outOfStock" && data.cards[key] > 0 ? "border-rose-200" : "border-slate-100"}`}>
          <div className={`absolute -right-5 -top-6 h-24 w-24 rounded-full opacity-50 ${tint === "blue" ? "bg-blue-50" : tint === "green" ? "bg-emerald-50" : tint === "amber" ? "bg-amber-50" : tint === "red" ? "bg-rose-50" : tint === "sky" ? "bg-sky-50" : "bg-violet-50"}`} />
          <div className="relative flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-3 truncate text-[27px] font-bold leading-none tracking-tight text-[#142B4A]">{key === "inventoryValue" ? currency.format(data.cards[key]) : number.format(data.cards[key] || 0)}</p>
              <div className="mt-3 min-h-[22px]">{trendKey ? <Trend value={data.trends[trendKey]} /> : key === "lowStock" && data.cards[key] > 0 ? <span className="text-[11px] font-semibold text-amber-600">ควรตรวจสอบรายการ</span> : key === "outOfStock" && data.cards[key] > 0 ? <span className="text-[11px] font-semibold text-rose-600">ต้องเติมสินค้า</span> : <span className="text-[11px] text-slate-400">{key === "inventoryValue" ? "คำนวณจากราคาทุน" : "ยอดคงเหลือปัจจุบัน"}</span>}</div>
            </div>
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${tint === "blue" ? "bg-blue-50 text-blue-600" : tint === "green" ? "bg-emerald-50 text-emerald-600" : tint === "amber" ? "bg-amber-50 text-amber-600" : tint === "red" ? "bg-rose-50 text-rose-600" : tint === "sky" ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"}`}><Icon size={21} strokeWidth={2} /></div>
          </div>
        </div>;
        return link ? <Link key={key} to={link} className="block rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-amber-200">{content}</Link> : <div key={key}>{content}</div>;
      })}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.95fr]">
      <section className="surface-card p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Activity size={18} /></span><h2 className="text-[15px] font-bold text-[#142B4A]">สรุปการเบิกจ่ายประจำเดือน</h2></div><p className="ml-11 mt-1 text-xs text-slate-400">เปรียบเทียบปริมาณรับเข้าและเบิกออก 12 เดือนล่าสุด</p></div>
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-medium text-slate-500">ข้อมูลจากฐานข้อมูลจริง</span>
        </div>
        <div className="mb-4 flex flex-wrap gap-4 pl-1 text-xs">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" /><span className="text-slate-600">เบิกออก</span><Trend value={data.trends.stockOut} /></div>
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#8AB8FF]" /><span className="text-slate-600">รับเข้า</span><Trend value={data.trends.stockIn} /></div>
        </div>
        <div className="h-[255px]">
          {data.chart.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data.chart} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#EDF1F7" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ border: "1px solid #E8EDF4", borderRadius: 12, boxShadow: "0 8px 24px rgba(20,43,74,.08)", fontSize: 12 }} />
            <Line type="monotone" dataKey="stockOut" name="เบิกออก" stroke="#2563EB" strokeWidth={3} dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="stockIn" name="รับเข้า" stroke="#8AB8FF" strokeWidth={3} dot={{ r: 3, fill: "#8AB8FF", strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-xl bg-slate-50/70 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-500"><Activity size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-600">ยังไม่มีข้อมูลความเคลื่อนไหว</p><p className="mt-1 text-xs text-slate-400">รายการรับเข้า/เบิกออกจะแสดงในกราฟนี้</p></div></div>}
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600"><CircleAlert size={18} /></span><h2 className="text-[15px] font-bold text-[#142B4A]">วัสดุใกล้หมด</h2></div><p className="ml-11 mt-1 text-xs text-slate-400">สินค้าในระดับขั้นต่ำที่ควรติดตาม</p></div>
          <Link to="/products?stock=low" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800">ดูทั้งหมด <ArrowRight size={14} /></Link>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#F7F9FC] px-3 py-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-amber-500 shadow-sm"><CircleAlert size={17} /></div>
          <div><p className="text-sm font-bold text-[#142B4A]">{number.format(data.cards.lowStock)} <span className="text-xs font-medium text-slate-500">รายการต้องติดตาม</span></p><p className="text-[10px] text-slate-400">คงเหลือน้อยกว่าหรือเท่ากับจำนวนขั้นต่ำ</p></div>
        </div>
        <div className="mt-4 grid grid-cols-[118px_1fr] items-center gap-2 sm:grid-cols-[140px_1fr]">
          <div className="relative h-[150px]">
            {data.cards.totalProducts > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.stockStatus.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={45} outerRadius={64} paddingAngle={3} stroke="none">{data.stockStatus.filter((item) => item.value > 0).map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="grid h-full place-items-center"><div className="h-24 w-24 rounded-full border-[14px] border-slate-100" /></div>}
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-lg font-bold text-[#142B4A]">{number.format(data.cards.totalProducts)}</p><p className="text-[9px] text-slate-400">สินค้า</p></div></div>
          </div>
          <div className="space-y-2.5">
            {data.stockStatus.map((item) => <div key={item.name} className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span><span className="font-semibold text-slate-700">{number.format(item.value)}</span></div>)}
            <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-400">สัดส่วนตามสถานะคงเหลือ</div>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          {data.lowStockItems.length ? data.lowStockItems.slice(0, 3).map((item) => <Link key={item.id} to={`/products?search=${encodeURIComponent(item.sku)}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-amber-50/60">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAF2FF] text-blue-700"><Package size={17} /></div>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-700">{item.name}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{item.sku}</p></div>
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">{item.stockQuantity} / {item.minimumStock} {item.unit}</span>
          </Link>) : <div className="mt-2 rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-400">ยังไม่มีสินค้าใกล้หมด</div>}
        </div>
      </section>
    </div>

    <section className="surface-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><Activity size={18} /></span><h2 className="text-[15px] font-bold text-[#142B4A]">รายการวัสดุในคลังล่าสุด</h2></div><p className="ml-11 mt-1 text-xs text-slate-400">ความเคลื่อนไหวที่บันทึกในระบบ</p></div>
        <Link to="/reports" className="ml-11 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 sm:ml-0">ดูประวัติทั้งหมด <ArrowRight size={14} /></Link>
      </div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[690px] text-left text-sm">
          <thead className="bg-[#F8FAFD] text-[10px] font-semibold uppercase tracking-wide text-slate-400"><tr>{["รายการ", "ประเภท", "จำนวน", "ผู้ทำรายการ", "วันที่ดำเนินการ"].map((item) => <th key={item} className="px-5 py-3.5">{item}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-50">
            {data.recent.map((item) => <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
              <td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><Package size={16} /></span><span><span className="block font-semibold text-slate-700">{item.product.name}</span><span className="mt-0.5 block text-[10px] text-slate-400">{item.product.sku}</span></span></div></td>
              <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.type === "STOCK_IN" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${item.type === "STOCK_IN" ? "bg-emerald-500" : "bg-blue-500"}`} />{item.type === "STOCK_IN" ? "รับเข้าคลัง" : "เบิกออก"}</span></td>
              <td className="px-5 py-3.5 font-semibold text-slate-700">{item.type === "STOCK_IN" ? "+" : "-"}{number.format(item.quantity)}</td>
              <td className="px-5 py-3.5 text-xs text-slate-600">{item.createdBy.name}</td>
              <td className="px-5 py-3.5 text-xs text-slate-500">{new Date(item.movementDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</td>
            </tr>)}
            {!data.recent.length && <tr><td colSpan="5" className="px-5 py-12 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-400"><Boxes size={20} /></div><p className="mt-3 text-sm font-medium text-slate-600">ยังไม่มีรายการเคลื่อนไหว</p><p className="mt-1 text-xs text-slate-400">เมื่อมีการรับเข้าหรือเบิกออก ระบบจะแสดงข้อมูลที่นี่</p></td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><ArrowDownToLine size={17} /></span><div><p className="text-xs font-semibold text-slate-700">รายการรับเข้าทั้งหมด</p><p className="text-[10px] text-slate-400">ธุรกรรมในระบบ</p></div></div><p className="text-lg font-bold text-[#142B4A]">{number.format(data.cards.stockIn)}</p></div>
      <div className="flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><ArrowUpFromLine size={17} /></span><div><p className="text-xs font-semibold text-slate-700">รายการเบิกออกทั้งหมด</p><p className="text-[10px] text-slate-400">ธุรกรรมในระบบ</p></div></div><p className="text-lg font-bold text-[#142B4A]">{number.format(data.cards.stockOut)}</p></div>
    </div>
  </div>;
}
