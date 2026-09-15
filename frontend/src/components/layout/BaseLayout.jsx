import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/button";
export default function BaseLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navLinks = [
        { path: "/dashboard", label: "Dashboard" },
        { path: "/assets", label: "My Assets" },
        { path: "/profile", label: "Profile" },
    ];

    return (
        <div className="flex min-h-screen bg-background text-on-background">
            {/* Sidebar */}
            <aside className="w-64 bg-surface-container-low border-r border-outline-variant p-4 flex flex-col">
                <div className="text-xl font-bold text-primary mb-8 px-2">
                    BELTAL
                </div>
                <nav className="flex-1 space-y-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`block px-4 py-2 rounded-lg text-body-md transition-colors ${location.pathname === link.path
                                ? "bg-primary-container text-on-primary-container font-semibold"
                                : "text-on-surface-variant hover:bg-surface-container"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <button
                    onClick={logout}
                    className="mt-auto px-4 py-2 text-sm text-error hover:bg-error-container rounded-lg transition-colors"
                >
                    Logout
                </button>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col">
                {/* Top Navbar */}
                <header className="h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-6">
                    <h2 className="text-title-md text-on-surface">
                        {location.pathname === "/dashboard" ? "Dashboard" : "Page"}
                    </h2>
                    <div className="flex items-center gap-3">
                        <span className="text-body-sm text-on-surface-variant">
                            {user?.name || "User"} ({user?.role || "role"})
                        </span>
                        <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed text-sm font-bold">
                            {user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                    </div>
                </header>

                {/* Page Content (Outlet) */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}