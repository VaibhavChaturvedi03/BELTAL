import { lazy, Suspense, useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { TransactionProvider } from "./context/TransactionContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BaseLayout from "./components/layout/BaseLayout";
import LandingPage from "./pages/LandingPage";
const ContactPage = lazy(() => import("./pages/ContactPage"));
const UIKitPage = lazy(() => import("./pages/UIKitPage"));
const DashboardRedirect = lazy(() => import("./pages/DashboardRedirect"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const IdentityLedger = lazy(() => import("./pages/admin/IdentityLedger"));
const RoleAssignment = lazy(() => import("./pages/admin/RoleAssignment"));
const MintAsset = lazy(() => import("./pages/admin/MintAsset"));
const AssetList = lazy(() => import("./pages/admin/AssetList"));
const TransferApprovals = lazy(() => import("./pages/admin/TransferApprovals"));

// Manager Pages
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const TeamMembers = lazy(() => import("./pages/manager/TeamMembers"));
const TeamAssets = lazy(() => import("./pages/manager/TeamAssets"));
const InitiateTransfer = lazy(() => import("./pages/manager/InitiateTransfer"));

// Auditor Pages
const AuditorDashboard = lazy(() => import("./pages/auditor/AuditorDashboard"));
const AuditTrailExplorer = lazy(() => import("./pages/auditor/AuditTrailExplorer"));

// User Pages
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const MyAssets = lazy(() => import("./pages/user/MyAssets"));
const AssetDetail = lazy(() => import("./pages/user/AssetDetail"));
const RequestTransferForm = lazy(() => import("./pages/user/RequestTransferForm"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
import ErrorBoundary from "./components/ErrorBoundary";

/**
 * Completes the SPA transition when a nav link lands on "/" carrying a
 * section hash (e.g. clicked from /contact, or a direct "/#features" deep
 * link) — never a full page reload. The target section doesn't exist in
 * the DOM the instant the route changes (LandingPage still has to render),
 * so this polls for it across a bounded number of frames instead of
 * guessing a fixed delay.
 */
function ScrollToHashSection() {
  const location = useLocation();
  const rafRef = useRef(null);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!location.hash) return;

    const id = location.hash.slice(1);
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // ~1s at 60fps — generous for a route+render cycle

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
      attempts += 1;
      if (attempts < MAX_ATTEMPTS) {
        rafRef.current = requestAnimationFrame(tryScroll);
      }
    };
    rafRef.current = requestAnimationFrame(tryScroll);

    return () => cancelAnimationFrame(rafRef.current);
  }, [location.pathname, location.hash]);

  return null;
}

function RouteLoader() {
  return <div className="app-route-loader" role="status" aria-live="polite"><div className="app-route-loader__mark" /><p>Preparing secure workspace…</p></div>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <TransactionProvider>
            <ScrollToHashSection />
            <Suspense fallback={<RouteLoader />}>
            <Routes>
                {/* ── Public Routes ── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LandingPage autoOpenLogin />} />
                <Route path="/contact" element={<ContactPage />} />

                {/* ── Protected Area wrapped in BaseLayout ── */}
                <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "AUDITOR", "USER"]} />}>
                  <Route element={<BaseLayout />}>

                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* UI Kit — any authenticated role */}
                    <Route path="/ui-kit" element={<UIKitPage />} />

                    {/* Admin-only */}
                    <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                      <Route path="/admin" element={<AdminDashboard />} />
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/identities" element={<IdentityLedger />} />
                      <Route path="/admin/users" element={<AdminDashboard />} />
                      <Route path="/admin/roles" element={<RoleAssignment />} />
                      <Route path="/admin/mint-asset" element={<MintAsset />} />
                      <Route path="/admin/assets" element={<AssetList />} />
                      <Route path="/admin/transfers" element={<TransferApprovals />} />
                      <Route path="/admin/nodes" element={<div className="p-8 text-slate-200">Sovereign Nodes — Coming Soon</div>} />
                      <Route path="/admin/audit" element={<div className="p-8 text-slate-200">Audit Vault — Coming Soon</div>} />
                    </Route>

                    {/* Manager / Admin */}
                    <Route element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]} />}>
                      <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                      <Route path="/team" element={<TeamMembers />} />
                      <Route path="/team-assets" element={<TeamAssets />} />
                      <Route path="/transfer/initiate" element={<InitiateTransfer />} />
                      <Route path="/assets/ledger" element={<AssetList />} />
                      <Route path="/transfers" element={<TransferApprovals />} />
                      <Route path="/did/issue" element={<div className="p-8 text-slate-200">DID Issuance — Coming Soon</div>} />
                      <Route path="/dispatch/sign" element={<div className="p-8 text-slate-200">Sign Dispatch — Coming Soon</div>} />
                    </Route>

                    {/* Auditor / Admin */}
                    <Route element={<ProtectedRoute allowedRoles={["ADMIN", "AUDITOR"]} />}>
                      <Route path="/auditor/dashboard" element={<AuditorDashboard />} />
                      <Route path="/audit/explorer" element={<AuditTrailExplorer />} />
                      <Route path="/audit/ledgers" element={<div className="p-8 text-slate-200">Read-Only Ledgers</div>} />
                      <Route path="/audit/logs" element={<div className="p-8 text-slate-200">Verification Logs</div>} />
                    </Route>

                    {/* User-only routes */}
                    <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
                      <Route path="/user/dashboard" element={<UserDashboard />} />
                      <Route path="/my-assets" element={<MyAssets />} />
                      <Route path="/user/assets/:id" element={<AssetDetail />} />
                      <Route path="/transfer/request" element={<RequestTransferForm />} />
                    </Route>

                  </Route>
                </Route>

                {/* Smart Dashboard Redirect - handles /dashboard for all roles */}
                <Route path="/dashboard" element={<DashboardRedirect />} />

                {/* Fallback */}
                <Route path="*" element={<LandingPage />} />
            </Routes>
            </Suspense>
          </TransactionProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
