import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./CheckInHub.css";

export default function CheckInHub() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [weddings, setWeddings] = useState([]);
  const [weddingStats, setWeddingStats] = useState({}); // wedding_id -> { totalGuests, checkedCount, percentage }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSessionAndWeddings();
  }, []);

  const fetchSessionAndWeddings = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/admin/login");
        return;
      }

      const { data: adminData } = await supabase
        .from("admins")
        .select("*")
        .eq("id", session.user.id)
        .eq("role", "admin")
        .eq("is_active", true)
        .single();

      if (!adminData) {
        navigate("/admin/login");
        return;
      }
      setAdmin(adminData);

      // Fetch all weddings for this admin
      const { data: weddingList, error: weddingErr } = await supabase
        .from("weddings")
        .select("*")
        .eq("admin_id", adminData.id)
        .order("wedding_date", { ascending: false });

      if (weddingErr) throw new Error(weddingErr.message);
      setWeddings(weddingList || []);

      // Calculate stats for each wedding
      const stats = {};
      if (weddingList && weddingList.length > 0) {
        for (const w of weddingList) {
          // Fetch guests for wedding
          const { data: guests } = await supabase
            .from("guests")
            .select("id, full_name, guest_count, checked_in")
            .eq("wedding_id", w.id);

          const guestList = guests || [];
          const totalGuests = guestList.length;

          // Check localStorage for offline/synced checkins
          let localCheckins = {};
          try {
            const raw = localStorage.getItem(`wedding_checkins_${w.id}`);
            if (raw) localCheckins = JSON.parse(raw);
          } catch (e) {}

          let checkedCount = 0;
          guestList.forEach((g) => {
            if (g.checked_in || localCheckins[g.id]?.checked_in) {
              checkedCount++;
            }
          });

          const percentage = totalGuests > 0 ? Math.round((checkedCount / totalGuests) * 100) : 0;
          stats[w.id] = { totalGuests, checkedCount, percentage };
        }
      }
      setWeddingStats(stats);
    } catch (err) {
      console.error("CheckInHub error:", err);
      setError("An error occurred while loading wedding check-in desks.");
    } finally {
      setLoading(false);
    }
  };

  const filteredWeddings = weddings.filter((w) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const couple = `${w.bride_name} ${w.groom_name}`.toLowerCase();
    const loc = (w.location_name || "").toLowerCase();
    return couple.includes(q) || loc.includes(q);
  });

  if (loading) {
    return (
      <div className="checkin-hub-loading">
        <div className="checkin-hub-spinner" />
        <p>Loading Check-In Desks…</p>
      </div>
    );
  }

  return (
    <div className="checkin-hub-page">
      {/* ── Header ── */}
      <div className="checkin-hub-header">
        <div>
          <div className="checkin-hub-tag">
            <span className="hub-dot" /> Live Check-In Management
          </div>
          <h1 className="checkin-hub-title">Wedding Check-In Desks</h1>
          <p className="checkin-hub-sub">
            Select a wedding event below to open its dedicated reception check-in desk, scan guest QR codes, and track arrivals in real-time.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* ── Search Bar ── */}
      <div className="checkin-hub-controls">
        <div className="checkin-hub-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search wedding by couple name or venue…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Wedding Desks Grid ── */}
      {weddings.length === 0 ? (
        <div className="checkin-hub-empty">
          <span style={{ fontSize: "3rem" }}>💒</span>
          <h3>No Weddings Found</h3>
          <p>Create a wedding first before managing guest check-in desks.</p>
          <Link to="/admin/create-wedding" className="btn-primary" style={{ marginTop: "1rem" }}>
            Create New Wedding
          </Link>
        </div>
      ) : filteredWeddings.length === 0 ? (
        <div className="checkin-hub-empty">
          <span style={{ fontSize: "2.5rem" }}>🔍</span>
          <h3>No events match "{searchQuery}"</h3>
          <p>Try searching for a different couple name or clear the search.</p>
        </div>
      ) : (
        <div className="checkin-desks-grid">
          {filteredWeddings.map((w) => {
            const stat = weddingStats[w.id] || { totalGuests: 0, checkedCount: 0, percentage: 0 };
            return (
              <div key={w.id} className="checkin-desk-card">
                <div className="checkin-desk-top">
                  <div className="desk-couple-info">
                    <span className="desk-ring-icon">💍</span>
                    <div>
                      <h3 className="desk-couple-names">
                        {w.bride_name} & {w.groom_name}
                      </h3>
                      <div className="desk-meta-row">
                        {w.wedding_date && (
                          <span className="desk-meta-item">
                            📅 {w.wedding_date} {w.wedding_time ? `• ${w.wedding_time.slice(0, 5)}` : ""}
                          </span>
                        )}
                        {w.location_name && (
                          <span className="desk-meta-item">
                            📍 {w.location_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`desk-status-pill ${w.status || "draft"}`}>
                    {w.status || "draft"}
                  </span>
                </div>

                {/* Progress bar and metrics */}
                <div className="desk-stats-box">
                  <div className="desk-stat-header">
                    <span className="desk-stat-label">Checked-In Arrivals</span>
                    <span className="desk-stat-numbers">
                      <strong>{stat.checkedCount}</strong> / {stat.totalGuests} Guests ({stat.percentage}%)
                    </span>
                  </div>
                  <div className="desk-progress-bar">
                    <div
                      className="desk-progress-fill"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="desk-actions">
                  <Link
                    to={`/admin/wedding/${w.id}/checkin`}
                    className="btn-open-desk"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h3v3h-3zM19 19h2v2h-2z" />
                    </svg>
                    Open Check-In Desk →
                  </Link>

                  <Link
                    to={`/admin/wedding/${w.id}/guests`}
                    className="btn-desk-guests"
                    title="View guest list"
                  >
                    Guests
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
