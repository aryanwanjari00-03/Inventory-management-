import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { HiOutlineViewGrid, HiOutlineCube, HiOutlineDocumentText, HiOutlineClock, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiX } from 'react-icons/hi';
import DotField from './DotField';

const navItems = [
  { to: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { to: '/inventory', icon: HiOutlineCube, label: 'Inventory' },
  { to: '/billing', icon: HiOutlineDocumentText, label: 'Bill Generator' },
  { to: '/history', icon: HiOutlineClock, label: 'History' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isDark = theme === 'dark';

  return (
    <div className="layout">
      {/* Mobile header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <HiOutlineMenu />
        </button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>🎨 {user?.businessName || 'Paint Shop'}</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Sidebar overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            {user?.shopLogo ? (
              <img src={user.shopLogo} alt="Logo" style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'cover' }} />
            ) : (
              <div className="sidebar-brand-icon">🎨</div>
            )}
            <div className="sidebar-brand-text">
              <h2>{user?.businessName || 'Paint Shop'}</h2>
              <p>{user?.ownerName || 'Owner'}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="nav-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <HiOutlineCog className="nav-icon" />
            Settings
          </NavLink>
          <button className="nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <HiOutlineLogout className="nav-icon" />
            Logout
          </button>
        </div>

        <div className="sidebar-branding">
          <div className="dev-label">Developed By </div>
          <div className="dev-name">EISTATECH</div>
        </div>
      </aside>

      <main className="main-content">
        <div style={{ position: 'fixed', top: 0, left: 'var(--sidebar-width)', right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
          <DotField
            dotRadius={1.5}
            dotSpacing={14}
            bulgeStrength={67}
            glowRadius={160}
            sparkle={false}
            waveAmplitude={0}
            cursorRadius={500}
            cursorForce={0.1}
            bulgeOnly
            gradientFrom={isDark ? "#A855F7" : "#6366f1"}
            gradientTo={isDark ? "#B497CF" : "#a855f7"}
            glowColor={isDark ? "#120F17" : "#f8fafc"}
          />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
