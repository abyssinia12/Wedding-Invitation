import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./AdminSidebar.css";

export default function AdminSidebar({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [weddings, setWeddings] = useState([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [weddingMenuOpen, setWeddingMenuOpen] = useState(true);

  useEffect(() => {
    fetchSessionAndWeddings();
  }, [location.pathname]);

  const fetchSessionAndWeddings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: adminData } = await supabase
        .from("admins")
        .select("*")
        .eq("id", session.user.id)
        .eq("role", "admin")
        .eq("is_active", true)
        .single();

      if (adminData) {
        setAdmin(adminData);

        const { data: weddingList } = await supabase
          .from("weddings")
          .select("*")
          .eq("admin_id", adminData.id)
          .order("created_at", { ascending: false });

        if (weddingList && weddingList.length > 0) {
          setWeddings(weddingList);

          // Check if path has a weddingId param
          const match = location.pathname.match(/\/wedding\/([^/]+)/);
          if (match && match[1]) {
            setSelectedWeddingId(match[1]);
          } else if (!selectedWeddingId) {
            setSelectedWeddingId(weddingList[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Sidebar init error:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const handleWeddingSelect = (newId) => {
    setSelectedWeddingId(newId);

    // If currently viewing guest list or invitations for a wedding, navigate to new wedding
    if (location.pathname.includes("/guests")) {
      navigate(`/admin/wedding/${newId}/guests`);
    } else if (location.pathname.includes("/invitations")) {
      navigate(`/admin/wedding/${newId}/invitations`);
    }
  };

  const currentWeddingId = selectedWeddingId || (weddings.length > 0 ? weddings[0].id : "");

  const isWeddingActive =
    location.pathname === "/admin/dashboard" ||
    location.pathname === "/admin/weddings" ||
    location.pathname === "/admin/create-wedding" ||
    location.pathname.includes("/edit-wedding");

  return (
    <div className="admin-layout-wrapper">
      {/* Mobile Toggle Button */}
      <button
        className="mobile-sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle Navigation"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar Navigation */}
      <aside className={`admin-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <svg className="sidebar-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <h2 className="sidebar-title">WeddingAdmin</h2>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/admin/dashboard"
            className={`sidebar-item ${location.pathname === "/admin/dashboard" ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </Link>

          {/* Wedding Menu Section */}
          <div className="sidebar-menu-group">
            <button
              className={`sidebar-menu-header ${isWeddingActive ? "header-active" : ""}`}
              onClick={() => setWeddingMenuOpen(!weddingMenuOpen)}
              type="button"
            >
              <div className="menu-header-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>Weddings</span>
              </div>
              <svg
                className={`chevron-icon ${weddingMenuOpen ? "open" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {weddingMenuOpen && (
              <div className="sidebar-submenu">
                <Link
                  to="/admin/weddings"
                  className={`sidebar-item submenu-item ${
                    location.pathname === "/admin/weddings" || location.pathname === "/admin/dashboard" ? "active" : ""
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Wedding List
                </Link>

                {/* <Link
                  to="/admin/create-wedding"
                  className={`sidebar-item submenu-item create-new-item ${
                    location.pathname === "/admin/create-wedding" ? "active" : ""
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create New
                </Link> */}
              </div>
            )}
          </div>

          <span className="nav-section-label" style={{ marginTop: '0.75rem' }}>Guest Management</span>

          {weddings.length > 0 && (
            <div style={{ padding: '0 0.75rem 0.5rem 0.75rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>
                Select Wedding Event:
              </label>
              <select
                value={currentWeddingId}
                onChange={(e) => handleWeddingSelect(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  fontSize: '0.8125rem',
                  outline: 'none'
                }}
              >
                {weddings.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.groom_name} & {w.bride_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentWeddingId ? (
            <>
              <Link
                to={`/admin/wedding/${currentWeddingId}/guests`}
                className={`sidebar-item ${location.pathname.includes('/guests') && !location.pathname.includes('/create') ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Guest List
              </Link>

              <Link
                to={`/admin/wedding/${currentWeddingId}/invitations`}
                className={`sidebar-item ${location.pathname.includes('/invitations') ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Invitations & QR
              </Link>

              <Link
                to="/invitation-styles"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-item"
                onClick={() => setMobileOpen(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>3 Invitation Styles ↗</span>
              </Link>
            </>
          ) : (
            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
              Create a wedding first to manage guest list & create guests.
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}
