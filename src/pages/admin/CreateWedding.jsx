import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import StyleSelectorBar from "../../components/StyleSelectorBar";
import "./CreateWedding.css";

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80"
];

export default function CreateWedding() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  // Ref for additional images upload
  const extraFileInputRef = useRef(null);
  // State to hold URLs of extra uploaded images
  const [extraImages, setExtraImages] = useState([]);

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
    theme: "first",
    // New field to hold extra image URLs
    extra_images: [],
  });

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
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
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (JPG, PNG, WEBP, etc.).");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `wedding-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("wedding-images")
        .upload(filePath, file, { upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("wedding-images")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
    } catch (err) {
      console.error("Image upload error:", err);
      setUploadError(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Upload multiple additional images
  const handleMultipleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadedUrls = [];
    setUploadError(null);
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          setUploadError(`File "${file.name}" is not a valid image.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setUploadError(`File "${file.name}" exceeds 5MB size limit.`);
          continue;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `wedding-extra-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `banners/${fileName}`;
        const { error: uploadErr } = await supabase.storage.from('wedding-images').upload(filePath, file, { upsert: false });
        if (uploadErr) {
          console.error('Upload error for', file.name, uploadErr);
          setUploadError(`Failed to upload ${file.name}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from('wedding-images').getPublicUrl(filePath);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }
      if (uploadedUrls.length > 0) {
        setExtraImages(prev => [...prev, ...uploadedUrls]);
      }
    } catch (err) {
      console.error('Multiple image upload error:', err);
      setUploadError(err.message || 'Failed to upload images.');
    } finally {
      setUploading(false);
      if (extraFileInputRef.current) extraFileInputRef.current.value = '';
    }
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

    setLoading(true);

    try {
      const payload = {
        admin_id: admin.id,
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
        // New field to hold extra image URLs
        extra_images: formData.extra_images,
        status: formData.status || "draft",
        theme: formData.theme || "first"
      };

      // Try inserting with theme
      let { data, error: insertErr } = await supabase
        .from("weddings")
        .insert([payload])
        .select()
        .single();

      // If Supabase table doesn't have the 'theme' column yet, retry without 'theme'
      if (insertErr && (insertErr.message?.includes("theme") || insertErr.code === "PGRST204")) {
        const { theme: _, ...payloadWithoutTheme } = payload;
        const retryResult = await supabase
          .from("weddings")
          .insert([payloadWithoutTheme])
          .select()
          .single();

        data = retryResult.data;
        insertErr = retryResult.error;

        // Remember user's chosen theme for this wedding in localStorage
        if (data?.id) {
          try {
            localStorage.setItem(`wedding_theme_${data.id}`, formData.theme);
          } catch (e) {
            console.warn("Could not save theme to localStorage", e);
          }
        }
      }

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1500);
    } catch (err) {
      console.error("Create wedding error:", err);
      setError(err.message || "Failed to create wedding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-wedding-container">
      <div className="create-wedding-card">
        <div className="card-header">
          <div className="header-title-group">
            <h1>Create Wedding Invitation</h1>
            <p>Fill in the couple's details, date, time, and venue location</p>
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
            <div>Wedding invitation created successfully! Redirecting to dashboard...</div>
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
              <label>Header Image</label>

              {/* Upload from PC */}
              <div className="upload-section">
                <input
                  ref={fileInputRef}
                  id="image_file_upload"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  className="btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16 }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload from PC
                    </>
                  )}
                </button>
                <span className="upload-hint">JPG, PNG, WEBP · max 5 MB</span>
              </div>

              {uploadError && (
                <p className="upload-error">{uploadError}</p>
              )}

              {/* Image preview */}
              {formData.image_url && (
                <div className="image-preview-wrap">
                  <img src={formData.image_url} alt="Selected banner" className="image-preview" />
                  <button
                    type="button"
                    className="btn-remove-image"
                    onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Or paste a URL */}
              <label htmlFor="image_url" style={{ marginTop: "0.5rem" }}>Or paste an image URL</label>
              <input
                id="image_url"
                name="image_url"
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formData.image_url}
                onChange={handleChange}
              />

              {/* Preset thumbnails */}
              <p className="preset-label">Or choose a preset:</p>
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
            {/* Section 7: Additional Images */}
            <div className="form-section">
              <h2 className="form-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5v14" />
                </svg>
                7. Additional Images
              </h2>
              <div className="form-field">
                <label>Upload Additional Images</label>
                <div className="upload-section">
                  <input
                    ref={extraFileInputRef}
                    id="extra_image_file_upload"
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handleMultipleImageUpload}
                  />
                  <button
                    type="button"
                    className="btn-upload"
                    onClick={() => extraFileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="spinner" style={{ width: 16, height: 16 }} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload More Images
                      </>
                    )}
                  </button>
                  <span className="upload-hint">JPG, PNG, WEBP · max 5 MB each</span>
                </div>
                {extraImages.map((url, idx) => (
                  <div key={idx} className="image-preview-wrap" style={{ position: "relative", display: "inline-block", margin: "4px" }}>
                    <img src={url} alt={`Extra ${idx + 1}`} className="image-preview" />
                    <button
                      type="button"
                      className="btn-remove-image"
                      style={{ position: "absolute", top: 0, right: 0 }}
                      onClick={() => setExtraImages(prev => prev.filter((_, i) => i !== idx))}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
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

          {/* Section 6: Invitation Style Selection */}
          <div className="form-section">
            <h2 className="form-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              6. Choose Invitation Style
            </h2>
            <div style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "0.875rem",
              padding: "1.25rem 1rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem"
            }}>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8", textAlign: "center" }}>
                Select the invitation style using the bar below (or via the floating bar pinned at the bottom):
              </p>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "9999px",
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                color: "#c7d2fe",
                fontSize: "0.825rem",
                fontWeight: 600
              }}>
                Current Selected Style: <span style={{ textTransform: "capitalize", color: "#ffffff", fontWeight: 700 }}>{formData.theme}</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/admin/dashboard" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Saving Wedding...
                </>
              ) : (
                "Save & Create Wedding"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Floating Glassmorphic Style Switcher Bar pinned to bottom */}
      <StyleSelectorBar
        currentStyle={formData.theme}
        onSelectStyle={(selectedStyle) =>
          setFormData((prev) => ({ ...prev, theme: selectedStyle }))
        }
      />
    </div>
  );
}
