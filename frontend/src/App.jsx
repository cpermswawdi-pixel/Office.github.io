import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Shell from "./components/Shell.jsx";

const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx"));
const MovementPage = lazy(() => import("./pages/MovementPage.jsx"));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx"));
const UsersPage = lazy(() => import("./pages/UsersPage.jsx"));
const MasterPage = lazy(() => import("./pages/MasterPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage.jsx"));
const RequisitionsPage = lazy(() => import("./pages/RequisitionsPage.jsx"));
const ApprovalsPage = lazy(() => import("./pages/ApprovalsPage.jsx"));
const StockIssuePage = lazy(() => import("./pages/StockIssuePage.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">กำลังตรวจสอบการเข้าสู่ระบบ...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return <Suspense fallback={<div className="grid min-h-screen place-items-center text-slate-500">กำลังโหลดหน้า...</div>}><Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
    <Route element={<Guard><Shell /></Guard>}>
      <Route index element={<DashboardPage />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="requisitions" element={<RequisitionsPage />} />
      <Route path="stock-in" element={<Guard roles={["SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF"]}><MovementPage type="in" /></Guard>} />
      <Route path="approvals" element={<Guard roles={["SUPER_ADMIN", "ADMIN"]}><ApprovalsPage /></Guard>} />
      <Route path="stock-issue" element={<Guard roles={["SUPER_ADMIN", "ADMIN", "STAFF", "WAREHOUSE_STAFF"]}><StockIssuePage /></Guard>} />
      <Route path="stock-out" element={<Navigate to="/requisitions" replace />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="users" element={<Guard roles={["SUPER_ADMIN", "ADMIN"]}><UsersPage /></Guard>} />
      <Route path="audit-logs" element={<Guard roles={["SUPER_ADMIN", "ADMIN"]}><AuditLogsPage /></Guard>} />
      <Route path="categories" element={<Guard roles={["SUPER_ADMIN", "ADMIN"]}><MasterPage resource="categories" title="หมวดหมู่สินค้า" fields={["name"]} /></Guard>} />
      <Route path="suppliers" element={<Guard roles={["SUPER_ADMIN", "ADMIN"]}><MasterPage resource="suppliers" title="ผู้จำหน่าย" fields={["name", "contactPerson", "phone", "email"]} /></Guard>} />
      <Route path="departments" element={<Guard roles={["SUPER_ADMIN", "ADMIN"]}><MasterPage resource="departments" title="แผนก" fields={["name"]} /></Guard>} />
      <Route path="units" element={<Guard roles={["SUPER_ADMIN", "ADMIN"]}><MasterPage resource="units" title="หน่วยนับ" fields={["name", "abbreviation"]} /></Guard>} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>;
}
