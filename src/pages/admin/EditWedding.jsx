import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./CreateWedding.css";
import "./EditWedding.css";
import "./ThemePicker.css";

const THEMES = [
  {
    key: "classic",
    name: "Classic Crimson & Gold",
    desc: "Timeless dark red velvet with golden accents",
    swatch: ["#8b0000", "#c9a84c", "#f5e6c8"],
    emoji: "🌹",
  },
  {
    key: "garden",
    name: "Garden Blush",
    desc: "Soft sage green with romantic blush pink tones",
    swatch: ["#3d5a47", "#d4a0a0", "#fdf6f0"],
    emoji: "🌸",
  },
  {
    key: "midnight",
    name: "Midnight Velvet",
    desc: "Deep navy blue with champagne gold shimmer",
    swatch: ["#0d1b3e", "#c8a96e", "#e8dcc8"],
    emoji: "✨",
  },
];

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80"
];

export default function EditWedding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    groom_name: "",
    bride_name: "",
    wedding_date: "",
    wedding_time: "16:00",
    location_name: "",
    location_address: "",
    latitude: "",
    longitude: "",
    message: "",
    image_url: PRESET_IMAGES[0],
    status: "draft",
    theme: "classic"
  });

  useEffect(() => {
    fetchWeddingAndAdmin();
  }, [id]);

  const fetchWeddingAndAdmin = async () => {
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

      // Fetch existing wedding data
      const { data: wedding, error: weddingErr } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", id)
        .eq("admin_id", adminData.id)
        .single();

      if (weddingErr || !wedding) {
        setError("Wedding invitation not found or access denied.");
        return;
      }

      setFormData({
        groom_name: wedding.groom_name || "",
        bride_name: wedding.bride_name || "",
        wedding_date: wedding.wedding_date || "",
        wedding_time: wedding.wedding_time || "16:00",
        location_name: wedding.location_name || "",
        location_address: wedding.location_address || "",
        latitude: wedding.latitude !== null ? String(wedding.latitude) : "",
        longitude: wedding.longitude !== null ? String(wedding.longitude) : "",
        message: wedding.message || "",
        image_url: wedding.image_url || PRESET_IMAGES[0],
        status: wedding.status || "draft",
        theme: wedding.theme || "classic"
      });
    } catch (err) {
      console.error("Fetch wedding error:", err);
      setError("An error occurred while loading wedding details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!admin) {
      setError("Admin session not found. Please log in again.");
      return;
    }

    if (!formData.groom_name || !formData.bride_name || !formData.wedding_date || !formData.wedding_time || !formData.location_name) {
      setError("Please fill in all required fields marked with *.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        groom_name: formData.groom_name.trim(),
        bride_name: formData.bride_name.trim(),
        message: formData.message ? formData.message.trim() : null,
        image_url: formData.image_url ? formData.image_url.trim() : null,
        wedding_date: formData.wedding_date,
        wedding_time: formData.wedding_time,
        location_name: formData.location_name.trim(),
        location_address: formData.location_address ? formData.location_address.trim() : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        status: formData.status || "draft",
        theme: formData.theme || "first",
        updated_at: new Date().toISOString()
      };

      let { error: updateErr } = await supabase
        .from("weddings")
        .update(payload)
        .eq("id", id)
        .eq("admin_id", admin.id);

      // If Supabase table doesn't have the 'theme' column yet, retry without 'theme'
      if (updateErr && (updateErr.message?.includes("theme") || updateErr.code === "PGRST204")) {
        const { theme: _, ...payloadWithoutTheme } = payload;
        const retryResult = await supabase
          .from("weddings")
          .update(payloadWithoutTheme)
          .eq("id", id)
          .eq("admin_id", admin.id);

        updateErr = retryResult.error;

        // Remember user's chosen theme for this wedding in localStorage
        try {
          localStorage.setItem(`wedding_theme_${id}`, formData.theme);
        } catch (e) {
          console.warn("Could not save theme to localStorage", e);
        }
      }

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1200);
    } catch (err) {
      console.error("Update wedding error:", err);
      setError(err.message || "Failed to update wedding invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const coupleName = `${formData.groom_name} & ${formData.bride_name}`;
    if (!window.confirm(`Are you sure you want to delete the wedding invitation for ${coupleName}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const { error: delErr } = await supabase
        .from("weddings")
        .delete()
        .eq("id", id)
        .eq("admin_id", admin.id);

      if (delErr) {
        alert("Failed to delete: " + delErr.message);
      } else {
        navigate("/admin/dashboard");
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-wedding-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 1rem auto' }} />
          <p style={{ color: '#94a3b8' }}>Loading wedding details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="create-wedding-container">
      <div className="create-wedding-card">
        <div className="card-header">
          <div className="header-title-group">
            <h1>Edit Wedding Invitation</h1>
            <p>Update couple details, date, location or publication status</p>
          </div>
          <Link to="/admin/dashboard" className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
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
            <div>Wedding invitation updated successfully! Redirecting to dashboard...</div>
          </div>
        )}

        <form className="wedding-form" onSubmit={handleSubmit}>
          {/* Section 1: Couple Details */}
          <div className="form-section">
            <h2 className="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              1. Couple Details
            </h2>
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="groom_name">Groom's Name *</label>
                <input
                  id="groom_name"
                  name="groom_name"
                  type="text"
                  placeholder="e.g. Alexander Smith"
                  value={formData.groom_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="bride_name">Bride's Name *</label>
                <input
                  id="bride_name"
                  name="bride_name"
                  type="text"
                  placeholder="e.g. Sophia Johnson"
                  value={formData.bride_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Date & Time */}
          <div className="form-section">
            <h2 className="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              2. Event Schedule
            </h2>
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="wedding_date">Wedding Date *</label>
                <input
                  id="wedding_date"
                  name="wedding_date"
                  type="date"
                  value={formData.wedding_date}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="wedding_time">Wedding Time *</label>
                <input
                  id="wedding_time"
                  name="wedding_time"
                  type="time"
                  value={formData.wedding_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Venue & Location */}
          <div className="form-section">
            <h2 className="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              3. Venue & Map Location
            </h2>
            <div className="form-field">
              <label htmlFor="location_name">Venue Name *</label>
              <input
                id="location_name"
                name="location_name"
                type="text"
                placeholder="e.g. Grand Palace Resort & Gardens"
                value={formData.location_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="location_address">Full Address</label>
              <textarea
                id="location_address"
                name="location_address"
                placeholder="e.g. 123 Celebration Way, Beverly Hills, CA 90210"
                value={formData.location_address}
                onChange={handleChange}
                rows={2}
              />
            </div>
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="latitude">Latitude (Optional)</label>
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 34.0736"
                  value={formData.latitude}
                  onChange={handleChange}
                />
              </div>
              <div className="form-field">
                <label htmlFor="longitude">Longitude (Optional)</label>
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. -118.4004"
                  value={formData.longitude}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Banner & Invitation Message */}
          <div className="form-section">
            <h2 className="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              4. Banner & Invitation Message
            </h2>
            <div className="form-field">
              <label htmlFor="image_url">Header Image URL</label>
              <input
                id="image_url"
                name="image_url"
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formData.image_url}
                onChange={handleChange}
              />
              <div className="preset-images">
                {PRESET_IMAGES.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Preset ${idx + 1}`}
                    className={`preset-img-thumb ${formData.image_url === url ? "selected" : ""}`}
                    onClick={() => setFormData((prev) => ({ ...prev, image_url: url }))}
                  />
                ))}
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="message">Personal Greeting Message</label>
              <textarea
                id="message"
                name="message"
                placeholder="e.g. We request the honor of your presence as we celebrate our love..."
                value={formData.message}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>

          {/* Section 5: Status */}
          <div className="form-section">
            <h2 className="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              5. Publication Status
            </h2>
            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="draft">Draft (Private / Editing)</option>
                <option value="published">Published (Live to Guests)</option>
                <option value="closed">Closed (Event Finished)</option>
              </select>
            </div>
          </div>

          {/* Section 6: Invitation Style */}
          <div className="form-section">
            <h2 className="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              6. Invitation Page Style
            </h2>
            <p className="theme-picker-hint">Choose the visual theme your guests will see on their invitation.</p>
            <div className="theme-picker-grid">
              {THEMES.map((theme) => (
                <button
                  key={theme.key}
                  type="button"
                  className={`theme-card ${formData.theme === theme.key ? "theme-card--active" : ""}`}
                  onClick={() => setFormData((prev) => ({ ...prev, theme: theme.key }))}
                >
                  <div className="theme-card__swatches">
                    {theme.swatch.map((color, i) => (
                      <span key={i} className="theme-card__swatch" style={{ background: color }} />
                    ))}
                  </div>
                  <div className="theme-card__emoji">{theme.emoji}</div>
                  <div className="theme-card__name">{theme.name}</div>
                  <div className="theme-card__desc">{theme.desc}</div>
                  {formData.theme === theme.key && (
                    <div className="theme-card__badge">✓ Selected</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="form-actions" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
              disabled={deleting || submitting}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {deleting ? "Deleting..." : "Delete Wedding"}
            </button>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/admin/dashboard" className="btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn-primary" disabled={submitting || deleting}>
                {submitting ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                    Updating Wedding...
                  </>
                ) : (
                  "Update Wedding"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
