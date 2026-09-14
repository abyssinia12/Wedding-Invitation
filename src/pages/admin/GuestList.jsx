import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./GuestList.css";

export default function GuestList() {
  const { weddingId } = useParams();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Modal State
  const [editingGuest, setEditingGuest] = useState(null);

  useEffect(() => {
    fetchAdminWeddingAndGuests();
  }, [weddingId]);

  const fetchAdminWeddingAndGuests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/admin/login");
        return;
      }

      // Verify admin
      const { data: adminData, error: adminErr } = await supabase
        .from("admins")
        .select("*")
        .eq("id", session.user.id)
        .eq("role", "admin")
        .eq("is_active", true)
        .single();

      if (adminErr || !adminData) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }
      setAdmin(adminData);

      // Verify wedding ownership
      const { data: weddingData, error: weddingErr } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", weddingId)
        .eq("admin_id", adminData.id)
        .single();

      if (weddingErr || !weddingData) {
        setError("Wedding invitation not found or permission denied.");
        return;
      }
      setWedding(weddingData);

      // Fetch guests list for this wedding
      const { data: guestList, error: guestErr } = await supabase
        .from("guests")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: false });

      if (guestErr) {
        console.error("Error fetching guests:", guestErr);
        setError("Failed to load guest list.");
      } else {
        setGuests(guestList || []);
      }
    } catch (err) {
      console.error("Guest list page error:", err);
      setError("An error occurred while loading guest details.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGuest = async (e) => {
    e.preventDefault();
    if (!editingGuest?.full_name?.trim()) {
      alert("Please enter guest's full name.");
      return;
    }

    const count = parseInt(editingGuest.guest_count, 10);
    if (isNaN(count) || count < 1) {
      alert("Guest count must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: editingGuest.full_name.trim(),
        phone: editingGuest.phone ? editingGuest.phone.trim() : null,
        guest_count: count,
        updated_at: new Date().toISOString()
      };

      const { error: updateErr } = await supabase
        .from("guests")
        .update(payload)
        .eq("id", editingGuest.id)
        .eq("wedding_id", weddingId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setGuests((prev) =>
        prev.map((g) => (g.id === editingGuest.id ? { ...g, ...payload } : g))
      );
      setEditingGuest(null);
    } catch (err) {
      console.error("Update guest error:", err);
      alert(err.message || "Failed to update guest.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGuest = async (guestId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the guest list?`)) {
      return;
    }

    try {
      const { error: delErr } = await supabase
        .from("guests")
        .delete()
        .eq("id", guestId)
        .eq("wedding_id", weddingId);

      if (delErr) {
        alert("Failed to delete guest: " + delErr.message);
      } else {
        setGuests((prev) => prev.filter((g) => g.id !== guestId));
      }
    } catch (err) {
      console.error("Delete guest error:", err);
    }
  };

  if (loading) {
    return (
      <div className="guest-list-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 1rem auto' }} />
          <p style={{ color: '#94a3b8' }}>Loading guest list...</p>
        </div>
      </div>
    );
  }

  const filteredGuests = guests.filter((g) =>
    g.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.phone && g.phone.includes(searchQuery))
  );

  const totalInvitedEntries = guests.length;
  const totalAttendeesCount = guests.reduce((sum, g) => sum + (g.guest_count || 1), 0);

  return (
    <div className="guest-list-container">
      {/* Top Navbar */}
      <nav className="dashboard-nav">
        <Link to="/admin/dashboard" className="nav-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          WeddingAdmin
        </Link>
        <div className="nav-user">
          <Link to="/admin/dashboard" className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="guest-list-content">
        <div className="guest-header">
          <div className="guest-header-info">
            <h1>Guest List & RSVPs</h1>
            <p>
              Managing invitations for <strong>{wedding?.groom_name} & {wedding?.bride_name}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="total-attendees-badge">
              👥 {totalAttendeesCount} Total Attendees ({totalInvitedEntries} Party Groups)
            </div>
            <Link to={`/admin/wedding/${weddingId}/guests/create`} className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Guest
            </Link>
          </div>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        {/* Guests Table */}
        <div className="guest-table-card">
          <div className="guest-table-header">
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Invited Guests ({filteredGuests.length})</h3>
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {filteredGuests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '1.05rem' }}>No guest entries found.</p>
              <Link to={`/admin/wedding/${weddingId}/guests/create`} className="btn-primary">
                Add Your First Guest
              </Link>
            </div>
          ) : (
            <table className="guest-table">
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Phone Number</th>
                  <th>Guest Count</th>
                  <th>Date Added</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{g.full_name}</td>
                    <td>{g.phone || <span style={{ color: '#64748b' }}>N/A</span>}</td>
                    <td>
                      <span className="count-chip">{g.guest_count} {g.guest_count === 1 ? "Person" : "People"}</span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="action-btn edit"
                          onClick={() => setEditingGuest(g)}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteGuest(g.id, g.full_name)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Guest Modal */}
      {editingGuest && (
        <div className="modal-overlay" onClick={() => setEditingGuest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#ffffff' }}>Edit Guest Entry</h3>
              <button className="modal-close-btn" style={{ position: 'static' }} onClick={() => setEditingGuest(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateGuest} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }}>
              <div className="form-field">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={editingGuest.full_name}
                  onChange={(e) => setEditingGuest({ ...editingGuest, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={editingGuest.phone || ""}
                  onChange={(e) => setEditingGuest({ ...editingGuest, phone: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Guest Count *</label>
                <input
                  type="number"
                  min="1"
                  value={editingGuest.guest_count}
                  onChange={(e) => setEditingGuest({ ...editingGuest, guest_count: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingGuest(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
