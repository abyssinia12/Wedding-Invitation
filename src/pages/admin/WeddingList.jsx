import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./AdminDashboard.css";

function WeddingList() {
  const [weddings, setWeddings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchAdminAndWeddings();
  }, []);

  const fetchAdminAndWeddings = async () => {
    try {
      setLoading(true);
      setError("");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) { setError("You are not logged in."); return; }

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", session.user.id)
        .eq("role", "admin")
        .eq("is_active", true)
        .single();

      if (adminError) throw adminError;

      const { data: weddingList, error: weddingError } = await supabase
        .from("weddings")
        .select("*")
        .eq("admin_id", adminData.id)
        .order("created_at", { ascending: false });

      if (weddingError) throw weddingError;
      setWeddings(weddingList || []);
    } catch (err) {
      console.error("Error loading weddings:", err);
      setError(err.message || "Failed to load weddings.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWedding = async (id, coupleNames) => {
    if (!window.confirm(`Are you sure you want to delete the wedding for ${coupleNames}? This action cannot be undone.`)) return;
    setUpdatingId(id);
    try {
      setError("");
      const { error: deleteError } = await supabase.from("weddings").delete().eq("id", id);
      if (deleteError) throw deleteError;
      setWeddings((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error("Delete wedding error:", err);
      setError(err.message || "Failed to delete wedding.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: "0 auto 1rem auto" }} />
          <p style={{ color: "#94a3b8" }}>Loading weddings...</p>
        </div>
      </div>
    );
  }

  const publishedCount = weddings.filter((w) => w.status === "published").length;
  const draftCount = weddings.filter((w) => w.status === "draft").length;
  const closedCount = weddings.filter((w) => w.status === "closed").length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">

        {/* Header */}
        

        {/* Error Banner */}
        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        {/* Stats Grid */}
        {/* <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{weddings.length}</span>
              <span className="stat-label">Total Weddings</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon published">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{publishedCount}</span>
              <span className="stat-label">Published</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon draft">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{draftCount}</span>
              <span className="stat-label">Drafts</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon closed">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">{closedCount}</span>
              <span className="stat-label">Closed</span>
            </div>
          </div>
        </div> */}

        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Wedding List</h1>
            
          </div>
          <Link to="/admin/create-wedding" className="btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create New Wedding
          </Link>
        </div>
        {/* Section Label */}
        <div className="section-title">
          <span>All Events</span>
        </div>

        {/* Wedding Cards */}
        {weddings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="empty-title">No Weddings Found</h3>
            <p className="empty-desc">You haven't created any wedding invitation pages yet. Click below to get started.</p>
            <Link to="/admin/create-wedding" className="btn-primary" style={{ marginTop: "0.5rem" }}>
              Create Your First Wedding
            </Link>
          </div>
        ) : (
          <div className="weddings-grid">
            {weddings.map((w) => {
              const bgImg = w.image_url || "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80";
              const coupleNameStr = `${w.groom_name} & ${w.bride_name}`;

              return (
                <div key={w.id} className="wedding-card">
                  {/* Banner */}
                  <div className="card-banner" style={{ backgroundImage: `url(${bgImg})` }}>
                    <div className="card-banner-overlay" />
                    <span className={`card-status-badge badge-${w.status}`}>{w.status || "draft"}</span>
                  </div>

                  {/* Body */}
                  <div className="card-body">
                    <h3 className="couple-names">{coupleNameStr}</h3>

                    <div className="wedding-meta">
                      {w.wedding_date && (
                        <div className="meta-item">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{w.wedding_date}{w.wedding_time ? ` at ${w.wedding_time}` : ""}</span>
                        </div>
                      )}
                      {(w.location_name || w.venue) && (
                        <div className="meta-item">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{w.location_name || w.venue}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="card-actions">
                      <Link
                        to={`/admin/wedding/${w.id}/guests`}
                        className="action-btn"
                        style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", borderColor: "rgba(59,130,246,0.3)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Guests
                      </Link>

                      <Link
                        to={`/admin/wedding/${w.id}/guests/create`}
                        className="action-btn edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Guest
                      </Link>

                      <Link
                        to={`/admin/edit-wedding/${w.id}`}
                        className="action-btn"
                        style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", borderColor: "rgba(99,102,241,0.3)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </Link>

                      <button
                        className="action-btn delete"
                        disabled={updatingId === w.id}
                        onClick={() => handleDeleteWedding(w.id, coupleNameStr)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default WeddingList;

