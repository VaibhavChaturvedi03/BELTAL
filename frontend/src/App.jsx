import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BaseLayout from "./components/layout/BaseLayout";
import LandingPage from "./pages/LandingPage";
import ContactPage from "./pages/ContactPage";

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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToHashSection />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          
          {/* Protected Area wrapped in BaseLayout */}
          <Route element={<ProtectedRoute allowedRoles={["admin", "manager", "auditor", "user"]} />}>
            <Route element={<BaseLayout />}>
              <Route path="/dashboard" element={<div className="p-8 text-slate-200">Secure Dashboard Area</div>} />
            </Route>
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}