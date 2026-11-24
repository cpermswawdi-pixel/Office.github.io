import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine, ChartNoAxesCombined,
  Users, Tags, Truck, Building2, Settings, LogOut, Menu, X, ChevronRight,
  ClipboardList, ClipboardCheck, ClipboardPlus, PanelLeftClose, PanelLeftOpen, Search,
  Bell, BellRing, UserRound, ChevronDown, CircleAlert, PackageCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { COLLEGE_NAME, SYSTEM_LOGO, SYSTEM_NAME } from "../branding.js";

const navigation = [
  { to: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { to: "/products", label: "สินค้า", icon: Package },
  { to: "/requisitions", label: "เบิกวัสดุ", icon: ClipboardPlus },
  { to: "/approvals", label: "อนุมัติคำขอ", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/stock-issue", label: "จ่ายวัสดุ", icon: PackageCheck, roles: ["SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF"] },
  { to: "/stock-in", label: "รับเข้าวัสดุ", icon: ArrowDownToLine, roles: ["SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF"] },
  { to: "/notifications", label: "แจ้งเตือน", icon: BellRing },
  { to: "/reports", label: "รายงาน", icon: ChartNoAxesCombined },
  { to: "/categories", label: "หมวดหมู่", icon: Tags, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/suppliers", label: "ผู้จำหน่าย", icon: Truck, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/departments", label: "แผนก", icon: Building2, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/units", label: "หน่วยนับ", icon: Package, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/users", label: "ผู้ใช้งาน", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/audit-logs", label: "ประวัติระบบ", icon: ClipboardList, roles: ["SUPER_ADMIN", "ADMIN"] },
  { to: "/settings", label: "ตั้งค่าบัญชี", icon: Settings }
];

export default function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [lowStock, setLowStock] = useState([]);
  const [outOfStock, setOutOfStock] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      const [lowStockResult, outOfStockResult, notificationResult] = await Promise.allSettled([
        api.get("/products", { params: { stock: "low", limit: 5 } }),
        api.get("/products", { params: { stock: "out", limit: 5 } }),
        api.get("/requisitions/notifications", { params: { limit: 5 } })
      ]);
      if (!active) return;
      const failures = [];
      if (lowStockResult.status === "fulfilled") setLowStock(lowStockResult.value.data.data);
      else failures.push("โหลดการแจ้งเตือนสต็อกต่ำไม่สำเร็จ");
      if (outOfStockResult.status === "fulfilled") setOutOfStock(outOfStockResult.value.data.data);
      else failures.push("โหลดการแจ้งเตือนสินค้าหมดไม่สำเร็จ");
      if (notificationResult.status === "fulfilled") {
        setSystemNotifications(notificationResult.value.data.data);
        setUnreadCount(notificationResult.value.data.unreadCount);
      } else failures.push("โหลดการแจ้งเตือนคำขอไม่สำเร็จ");
      setNotificationError(failures.join(" · "));
    };
    loadNotifications();
    const timer = window.setInterval(loadNotifications, 120_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const openSystemNotification = async (notification) => {
    if (!notification.readAt) {
      try {
        await api.patch(`/requisitions/notifications/${notification.id}/read`);
        setSystemNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch {
        setNotificationError("ทำเครื่องหมายแจ้งเตือนว่าอ่านแล้วไม่สำเร็จ");
      }
    }
    setNotificationsOpen(false);
    navigate(notification.type === "REQUISITION_CREATED" ? "/approvals" : "/requisitions");
  };

  const logout = async () => {
    try { await signOut(); }
    finally { navigate("/login"); }
  };
  const roleLabel = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", STAFF: "เจ้าหน้าที่คลัง", WAREHOUSE_STAFF: "เจ้าหน้าที่คลัง", USER: "User" }[user?.role];
  const sectionName = navigation.find((item) => item.to === location.pathname)?.label || "คลังสินค้า";

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setSearch("");
  };

  return <div className="min-h-screen bg-[#F5F7FB] lg:flex">
    {mobileOpen && <button aria-label="ปิดเมนู" className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#142B4A] text-slate-200 shadow-xl shadow-slate-950/10 transition-all duration-200 lg:static lg:translate-x-0 ${collapsed ? "w-[84px]" : "w-[264px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className={`flex h-[82px] shrink-0 items-center border-b border-white/[.08] ${collapsed ? "justify-center px-3" : "gap-3 px-5"}`}>
        <img src={SYSTEM_LOGO} alt="" className="h-11 w-11 shrink-0 rounded-[14px] bg-white object-cover shadow-lg shadow-black/10" />
        {!collapsed && <div className="min-w-0"><p className="line-clamp-2 text-[10px] font-bold leading-4 text-white">{SYSTEM_NAME}</p><p className="mt-0.5 truncate text-[9px] font-medium text-sky-200">{COLLEGE_NAME}</p></div>}
        <button className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileOpen(false)} aria-label="ปิดเมนู"><X size={20} /></button>
      </div>
      {!collapsed && <div className="px-5 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-400/80">เมนูหลัก</div>}
      <nav className={`scrollbar-thin mt-3 flex-1 space-y-1.5 overflow-y-auto ${collapsed ? "px-3" : "px-3.5"}`}>
        {navigation.filter((item) => !item.roles || item.roles.includes(user?.role)).map(({ to, label, icon: Icon }) =>
          <NavLink key={to} to={to} end={to === "/"} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined}
            className={({ isActive }) => `group relative flex h-11 items-center rounded-xl text-[13px] transition-colors duration-150 ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${isActive ? "bg-white font-semibold text-[#142B4A] shadow-md shadow-black/10" : "text-slate-300 hover:bg-white/[.08] hover:text-white"}`}>
            <Icon size={18} strokeWidth={1.9} /><span className={`${collapsed ? "hidden" : "flex-1"}`}>{label}</span>
            {!collapsed && <ChevronRight size={15} className="opacity-0 transition group-[.active]:opacity-70" />}
          </NavLink>
        )}
      </nav>
      <div className={`border-t border-white/[.08] ${collapsed ? "p-3" : "p-4"}`}>
        <button onClick={() => setCollapsed((value) => !value)} className={`hidden h-10 w-full items-center rounded-lg text-slate-400 transition hover:bg-white/[.08] hover:text-white lg:flex ${collapsed ? "justify-center" : "gap-3 px-3"}`} title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}>
          {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /><span className="text-xs">ย่อเมนู</span></>}
        </button>
        <div className={`mt-2 flex items-center rounded-xl bg-white/[.06] ${collapsed ? "justify-center p-2" : "gap-3 p-2.5"}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#DCE9FF] text-sm font-bold text-[#1E4D8C]">{user?.name?.slice(0, 1)?.toUpperCase()}</div>
          {!collapsed && <div className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-semibold text-white">{user?.name}</p><p className="mt-0.5 text-[10px] text-slate-400">{roleLabel}</p></div>}
          {!collapsed && <button onClick={logout} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" title="ออกจากระบบ"><LogOut size={16} /></button>}
        </div>
      </div>
    </aside>
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden" aria-label="เปิดเมนู"><Menu size={21} /></button>
          <div className="min-w-0"><p className="hidden max-w-[48vw] truncate text-[11px] text-slate-400 sm:block">{SYSTEM_NAME}</p><p className="truncate text-[15px] font-semibold text-[#142B4A]">{sectionName}</p></div>
        </div>
        <form onSubmit={submitSearch} className="hidden w-full max-w-[390px] lg:block">
          <div className="group flex h-10 items-center rounded-xl border border-slate-200 bg-[#F8FAFC] px-3 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
            <Search size={17} className="shrink-0 text-slate-400 group-focus-within:text-blue-600" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาสินค้า, SKU หรือ Barcode" className="h-full w-full border-0 bg-transparent px-2.5 text-xs outline-none placeholder:text-slate-400" aria-label="ค้นหาสินค้า" />
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 xl:inline">Enter</kbd>
          </div>
        </form>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden border-r border-slate-200 pr-4 text-right md:block"><p className="text-[11px] font-medium text-slate-700">{clock.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p><p className="mt-0.5 text-[10px] text-slate-400">{clock.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</p></div>
          <div className="relative">
            <button onClick={() => { setNotificationsOpen((value) => !value); setAccountOpen(false); }} aria-label="การแจ้งเตือน" aria-expanded={notificationsOpen} className={`relative grid h-10 w-10 place-items-center rounded-xl transition ${notificationsOpen ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}><Bell size={19} />{(lowStock.length > 0 || outOfStock.length > 0 || unreadCount > 0) && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#EF4444]" />}</button>
            {notificationsOpen && <div className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-sm font-semibold text-slate-800">แจ้งเตือนคลังสินค้า</p><p className="mt-0.5 text-[11px] text-slate-400">ยังไม่อ่าน {unreadCount} · ใกล้หมด {lowStock.length} · หมด {outOfStock.length}</p></div><Bell size={17} className="text-slate-400" /></div>
              <div className="max-h-72 overflow-y-auto">
                {notificationError && <p role="alert" className="px-4 py-2 text-[10px] text-rose-600">{notificationError}</p>}
                {systemNotifications.map((notification) => <button key={`notification-${notification.id}`} onClick={() => openSystemNotification(notification)} className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-blue-50/60 ${notification.readAt ? "" : "bg-blue-50/30"}`}>
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${notification.readAt ? "bg-slate-50 text-slate-400" : "bg-blue-50 text-blue-700"}`}><BellRing size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{notification.title}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{notification.message}</span></span>
                </button>)}
                {lowStock.map((product) => <button key={`low-${product.id}`} onClick={() => { setNotificationsOpen(false); navigate(`/products?search=${encodeURIComponent(product.sku)}`); }} className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-amber-50/60">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><CircleAlert size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{product.name}</span><span className="mt-1 block text-[11px] text-slate-500">คงเหลือ {product.stockQuantity} / ขั้นต่ำ {product.minimumStock} · {product.sku}</span></span>
                </button>)}
                {outOfStock.map((product) => <button key={`out-${product.id}`} onClick={() => { setNotificationsOpen(false); navigate(`/products?search=${encodeURIComponent(product.sku)}`); }} className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-rose-50/60">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600"><CircleAlert size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-700">{product.name}</span><span className="mt-1 block text-[11px] text-rose-600">สินค้าหมด · {product.sku}</span></span>
                </button>)}
                {!lowStock.length && !outOfStock.length && !systemNotifications.length && <div className="px-4 py-8 text-center text-xs text-slate-400">ไม่มีการแจ้งเตือนใหม่</div>}
              </div>
              <Link to="/notifications" onClick={() => setNotificationsOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-blue-700 hover:bg-blue-50">ดูการแจ้งเตือนทั้งหมด</Link>
            </div>}
          </div>
          <div className="relative">
            <button onClick={() => { setAccountOpen((value) => !value); setNotificationsOpen(false); }} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100" aria-label="เมนูบัญชีผู้ใช้" aria-expanded={accountOpen}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#DCE9FF] text-sm font-bold text-[#1E4D8C]">{user?.name?.slice(0, 1)?.toUpperCase()}</span>
              <span className="hidden max-w-28 text-left xl:block"><span className="block truncate text-xs font-semibold text-slate-700">{user?.name}</span><span className="mt-0.5 block text-[10px] text-slate-400">{roleLabel}</span></span>
              <ChevronDown size={15} className="hidden text-slate-400 xl:block" />
            </button>
            {accountOpen && <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
              <div className="border-b border-slate-100 px-3 py-2.5"><p className="truncate text-xs font-semibold text-slate-800">{user?.name}</p><p className="mt-1 truncate text-[11px] text-slate-400">{user?.email}</p></div>
              <Link to="/settings" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50"><UserRound size={16} />ตั้งค่าบัญชี</Link>
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-rose-600 hover:bg-rose-50"><LogOut size={16} />ออกจากระบบ</button>
            </div>}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] p-4 page-enter md:p-7 xl:p-8"><Outlet /></div>
    </main>
  </div>;
}
