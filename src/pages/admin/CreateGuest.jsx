import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./CreateGuest.css";
import "./CreateWedding.css";

export default function CreateGuest() {
  const { weddingId } = useParams();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);

  useEffect(() => {
    checkAdminAndWedding();
  }, [weddingId]);

  const checkAdminAndWedding = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/admin/login");
        return;
      }

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

      const { data: weddingData, error: weddingErr } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", weddingId)
        .eq("admin_id", adminData.id)
        .single();

      if (weddingErr || !weddingData) {
        setError("Wedding invitation not found or access denied.");
        return;
      }
      setWedding(weddingData);
    } catch (err) {
      console.error("Check admin error:", err);
      setError("An error occurred loading event details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuest = async (e, addAnother = false) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim()) {
      setError("Please enter the guest's full name.");
      return;
    }

    const count = parseInt(guestCount, 10);
    if (isNaN(count) || count < 1) {
      setError("Guest count must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        wedding_id: weddingId,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        guest_count: count
      };

      const { error: insertErr } = await supabase
        .from("guests")
        .insert([payload])
        .select()
        .single();

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      setSuccess(true);
      if (addAnother) {
        setFullName("");
        setPhone("");
        setGuestCount(1);
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setTimeout(() => {
          navigate(`/admin/wedding/${weddingId}/guests`);
        }, 1000);
      }
    } catch (err) {
      console.error("Create guest error:", err);
      setError(err.message || "Failed to create guest entry.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="create-guest-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 1rem auto' }} />
          <p style={{ color: '#94a3b8' }}>Loading event details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-guest-container">
      <div className="create-guest-card">
        <div className="card-header-guest">
          <div>
            <h1>Add New Guest</h1>
            <p>For {wedding?.groom_name} & {wedding?.bride_name}'s Wedding</p>
          </div>
          <Link to={`/admin/wedding/${weddingId}/guests`} className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Guest List
          </Link>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginBottom: "1.5rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="admin-alert admin-alert-success" style={{ marginBottom: "1.5rem" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>Guest entry added successfully!</div>
          </div>
        )}

        <form onSubmit={(e) => handleCreateGuest(e, false)} className="wedding-form">
          <div className="form-field">
            <label htmlFor="full_name">Guest Full Name *</label>
            <input
              id="full_name"
              type="text"
              placeholder="e.g. Mr. Robert & Emily Davis"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              id="phone"
              type="text"
              placeholder="e.g. +1 (555) 234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="guest_count">Number of Attendees (Guest Count) *</label>
            <input
              id="guest_count"
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              required
            />
          </div>

          <div className="form-actions" style={{ justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to={`/admin/wedding/${weddingId}/guests`} className="btn-secondary">
              Cancel
            </Link>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting}
                onClick={(e) => handleCreateGuest(e, true)}
              >
                Save & Add Another
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? "Saving..." : "Save Guest Entry"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
