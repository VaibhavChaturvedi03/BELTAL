import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useTheme } from '../../context/ThemeContext';

export default function BaseLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const location = useLocation();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex transition-colors duration-200 ${
      isDark ? 'bg-[#060D1A]' : 'bg-[#E8F1FB]'
    }`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`flex-1 flex flex-col min-h-screen transition-[margin] duration-200 ease-out ${
        collapsed ? 'ml-16' : 'ml-64'
      }`}>
        <Topbar />
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          <div key={location.pathname} className="app-page-transition">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
