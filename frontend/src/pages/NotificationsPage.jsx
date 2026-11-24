import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, CircleAlert, CircleCheck, CircleDot, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Notice from "../components/Notice.jsx";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [outOfStock, setOutOfStock] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [saved, low, out] = await Promise.all([
        api.get("/requisitions/notifications", { params: { limit: 50 } }),
        api.get("/products", { params: { stock: "low", limit: 50 } }),
        api.get("/products", { params: { stock: "out", limit: 50 } })
      ]);
      setNotifications(saved.data.data);
      setUnreadCount(saved.data.unreadCount);
      setLowStock(low.data.data);
      setOutOfStock(out.data.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.patch(`/requisitions/notifications/${id}/read`);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };
  const markAllRead = async () => {
    setBusy(true);
    setError("");
    try {
      await api.patch("/requisitions/notifications/read-all");
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const openNotification = async (notification) => {
    if (!notification.readAt) await markRead(notification.id);
    navigate(notification.type === "REQUISITION_CREATED" ? "/approvals" : "/requisitions");
  };
  const openProduct = (product, stock) => navigate(`/products?search=${encodeURIComponent(product.sku)}&stock=${stock}`);

  return <div className="space-y-5">
    <PageHeader title="การแจ้งเตือน" description="ติดตามคำขอเบิกและกิจกรรมที่เกี่ยวข้องกับบัญชีของคุณ" action={<button disabled={!unreadCount || busy} onClick={markAllRead} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={16} />อ่านทั้งหมดแล้ว</button>} />
    <Notice message={error} />
    <section className="grid gap-4 md:grid-cols-2">
      {[{ title: "วัสดุใกล้หมด", rows: lowStock, color: "amber", stock: "low" }, { title: "วัสดุหมดคลัง", rows: outOfStock, color: "rose", stock: "out" }].map(({ title, rows, color, stock }) => <div key={title} className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${color === "amber" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}><CircleAlert size={16} /></span><h2 className="text-sm font-bold text-[#142B4A]">{title}</h2></div><span className="text-xs text-slate-400">{rows.length} รายการ</span></div>
        <div className="divide-y divide-slate-50">
          {rows.slice(0, 5).map((product) => <button key={product.id} onClick={() => openProduct(product, stock)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50">
            <span className={`grid h-8 w-8 place-items-center rounded-lg ${color === "amber" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}><Package size={15} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{product.name}</span><span className="mt-0.5 block text-[10px] text-slate-400">{product.sku}</span></span>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${color === "amber" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{product.stockQuantity} / {product.minimumStock}</span>
          </button>)}
          {!rows.length && <p className="px-4 py-6 text-center text-xs text-slate-400">ไม่มีรายการ</p>}
        </div>
      </div>)}
    </section>
    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Bell size={18} /></span><div><h2 className="text-sm font-bold text-[#142B4A]">รายการแจ้งเตือน</h2><p className="mt-0.5 text-[11px] text-slate-400">ยังไม่อ่าน {unreadCount} รายการ</p></div></div></div>
      <div className="divide-y divide-slate-100">
        {loading ? [1, 2, 3].map((row) => <div key={row} className="animate-pulse space-y-3 px-5 py-5"><div className="h-4 w-48 rounded bg-slate-100" /><div className="h-3 w-3/4 rounded bg-slate-100" /></div>) : notifications.map((notification) => <button key={notification.id} onClick={() => openNotification(notification)} className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-blue-50/40 ${notification.readAt ? "bg-white" : "bg-blue-50/30"}`}>
          <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notification.readAt ? "bg-slate-50 text-slate-400" : "bg-blue-50 text-blue-700"}`}>{notification.readAt ? <CircleCheck size={17} /> : <CircleDot size={17} />}</span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-slate-700">{notification.title}</span>{!notification.readAt && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">ใหม่</span>}</span><span className="mt-1 block text-xs text-slate-500">{notification.message}</span><span className="mt-1.5 block text-[10px] text-slate-400">{new Date(notification.createdAt).toLocaleString("th-TH")}</span></span>
        </button>)}
        {!loading && !notifications.length && <div className="px-5 py-16 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-50 text-slate-400"><Bell size={19} /></div><p className="mt-3 text-sm font-medium text-slate-600">ไม่มีการแจ้งเตือน</p><p className="mt-1 text-xs text-slate-400">ระบบจะแจ้งเมื่อมีความเคลื่อนไหวเกี่ยวกับคำขอเบิกของคุณ</p></div>}
      </div>
    </section>
  </div>;
}
