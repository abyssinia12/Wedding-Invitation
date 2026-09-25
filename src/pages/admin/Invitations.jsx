import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../lib/supabase";
import "./Invitations.css";

export default function Invitations() {
  const { weddingId } = useParams();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [guests, setGuests] = useState([]);
  const [invitationsMap, setInvitationsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);
  const [previewGuest, setPreviewGuest] = useState(null);

  useEffect(() => {
    fetchData();
  }, [weddingId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/admin/login");
        return;
      }

      // Verify admin
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

      // Verify wedding
      const { data: weddingData, error: weddingErr } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", weddingId)
        .eq("admin_id", adminData.id)
        .single();

      if (weddingErr || !weddingData) {
        setError("Wedding not found or access denied.");
        return;
      }

      let loadedExtra = [];
      if (weddingData.extra_images) {
        if (Array.isArray(weddingData.extra_images)) loadedExtra = weddingData.extra_images;
        else if (typeof weddingData.extra_images === "string") {
          try { loadedExtra = JSON.parse(weddingData.extra_images); } catch(e) {}
        }
      }
      if (loadedExtra.length === 0 && weddingData.id) {
        try {
          const local = localStorage.getItem(`wedding_extra_images_${weddingData.id}`);
          if (local) loadedExtra = JSON.parse(local);
        } catch (e) {}
      }
      weddingData.extra_images = loadedExtra;

      setWedding(weddingData);

      // Fetch guests
      const { data: guestList } = await supabase
        .from("guests")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: false });

      setGuests(guestList || []);

      // Fetch invitations
      const { data: inviteList } = await supabase
        .from("invitations")
        .select("*")
        .eq("wedding_id", weddingId);

      const map = {};
      if (inviteList) {
        inviteList.forEach((inv) => {
          map[inv.guest_id] = inv;
        });
      }
      setInvitationsMap(map);
    } catch (err) {
      console.error("Invitations page error:", err);
      setError("An error occurred loading invitation details.");
    } finally {
      setLoading(false);
    }
  };

  const generateTokenAndUrl = (guestId) => {
    const randomPart = Math.random().toString(36).substring(2, 10);
    const timePart = Date.now().toString(36);
    const token = `inv_${guestId.substring(0, 8)}_${randomPart}${timePart}`;
    const invitationUrl = `${window.location.origin}/invite/${token}`;
    return { token, invitationUrl };
  };

  const handleGenerateInvitation = async (guestId) => {
    setGeneratingId(guestId);
    try {
      const { token, invitationUrl } = generateTokenAndUrl(guestId);

      const existing = invitationsMap[guestId];

      if (existing) {
        // Update existing invitation
        const { data: updated, error: updateErr } = await supabase
          .from("invitations")
          .update({
            token,
            invitation_url: invitationUrl,
            status: "active",
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateErr) throw new Error(updateErr.message);

        setInvitationsMap((prev) => ({ ...prev, [guestId]: updated }));
      } else {
        // Insert new invitation record
        const { data: created, error: insertErr } = await supabase
          .from("invitations")
          .insert([
            {
              wedding_id: weddingId,
              guest_id: guestId,
              token: token,
              invitation_url: invitationUrl,
              status: "active"
            }
          ])
          .select()
          .single();

        if (insertErr) throw new Error(insertErr.message);

        setInvitationsMap((prev) => ({ ...prev, [guestId]: created }));
      }
    } catch (err) {
      console.error("Generate invitation error:", err);
      alert(err.message || "Failed to generate invitation.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCopyUrl = (guestId, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(guestId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="invitations-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 1rem auto' }} />
          <p style={{ color: '#94a3b8' }}>Loading invitation tokens and QR codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invitations-container">
      {/* Top Navigation */}
      <nav className="dashboard-nav">
        <Link to="/admin/dashboard" className="nav-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          WeddingAdmin
        </Link>
        <div className="nav-user">
          <Link to={`/admin/wedding/${weddingId}/guests`} className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Guest List
          </Link>
        </div>
      </nav>

      <div className="invitations-content">
        <div className="invitations-header">
          <div className="invitations-title-group">
            <h1>Personalized Invitations & QR Codes</h1>
            <p>
              Generate unique tokens, custom invitation URLs, and QR passcodes for <strong>{wedding?.groom_name} & {wedding?.bride_name}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        {guests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="empty-title">No Guests Found</h3>
            <p className="empty-desc">Please add guests to the guest list first before generating personalized invitation links.</p>
            <Link to={`/admin/wedding/${weddingId}/guests/create`} className="btn-primary" style={{ marginTop: '0.5rem' }}>
              Add Your First Guest
            </Link>
          </div>
        ) : (
          <div className="invitation-cards-grid">
            {guests.map((g) => {
              const invite = invitationsMap[g.id];
              const isGenerating = generatingId === g.id;

              return (
                <div key={g.id} className="invitation-item-card">
                  <div className="guest-info-header">
                    <div>
                      <h3 className="guest-name-title">{g.full_name}</h3>
                      <span className="guest-phone-sub">
                        {g.phone ? `📱 ${g.phone}` : "No phone number"} • {g.guest_count} {g.guest_count === 1 ? "Guest" : "Guests"}
                      </span>
                    </div>

                    {invite ? (
                      <span className="active-tag" style={{ fontSize: '0.7rem' }}>
                        Active Token
                      </span>
                    ) : (
                      <span className="card-status-badge badge-draft" style={{ position: 'static' }}>
                        Pending Token
                      </span>
                    )}
                  </div>

                  {invite ? (
                    <>
                      {/* QR Code */}
                      <div className="qr-preview-box">
                        <div className="qr-code-wrapper">
                          <QRCodeSVG
                            value={invite.invitation_url}
                            size={140}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Scan to open personalized invitation
                        </span>
                      </div>

                      {/* Token & URL */}
                      <div className="token-display-box">
                        <span>{invite.invitation_url}</span>
                        <button
                          className="url-copy-btn"
                          onClick={() => handleCopyUrl(g.id, invite.invitation_url)}
                        >
                          {copiedId === g.id ? "Copied! ✓" : "Copy Link"}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        <button
                          className="action-btn"
                          onClick={() => setPreviewGuest({ guest: g, invite })}
                        >
                          Show Invitation
                        </button>
                        <button
                          className="action-btn edit"
                          disabled={isGenerating}
                          onClick={() => handleGenerateInvitation(g.id)}
                        >
                          {isGenerating ? "Regenerating..." : "Regenerate Token"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '0.75rem' }}>
                      <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                        No invitation token generated yet for {g.full_name}.
                      </p>
                      <button
                        className="btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={isGenerating}
                        onClick={() => handleGenerateInvitation(g.id)}
                      >
                        {isGenerating ? "Generating..." : "⚡ Generate Token & QR Code"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Personalized Invitation Preview Modal */}
      {previewGuest && (
        <div className="modal-overlay" onClick={() => setPreviewGuest(null)}>
          <div className="personalized-invitation-card" onClick={(e) => e.stopPropagation()}>
            <div
              className="personalized-hero"
              style={{
                backgroundImage: `url(${wedding?.image_url || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80'})`
              }}
            >
              <div className="personalized-hero-overlay" />
              <button className="modal-close-btn" onClick={() => setPreviewGuest(null)}>
                ✕
              </button>
            </div>

            <div className="personalized-body">
              <span className="wedding-badge-gold">Wedding Invitation</span>

              <h2 className="personalized-couple-name">
                {wedding?.groom_name} & {wedding?.bride_name}
              </h2>

              <div className="guest-greeting-box">
                <div className="greeting-to">Cordially Invited</div>
                <h3 className="guest-personal-name">{previewGuest.guest.full_name}</h3>
                <div className="guest-party-count">
                  Party of {previewGuest.guest.guest_count} {previewGuest.guest.guest_count === 1 ? "Person" : "People"}
                </div>
              </div>

              {wedding?.message && (
                <p style={{ fontStyle: 'italic', color: '#cbd5e1', margin: 0, fontSize: '0.95rem' }}>
                  "{wedding.message}"
                </p>
              )}

              <div className="invitation-event-info">
                <div className="info-pill">
                  📅 {wedding?.wedding_date} at {wedding?.wedding_time}
                </div>
                <div className="info-pill">
                  📍 {wedding?.location_name}
                </div>
              </div>

              {/* Additional Images Strip */}
              {wedding?.extra_images && wedding.extra_images.length > 0 && (
                <div style={{ margin: "1rem 0", textAlign: "center" }}>
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    ✦ Gallery Moments ({wedding.extra_images.length}) ✦
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem", justifyContent: wedding.extra_images.length <= 3 ? "center" : "flex-start" }}>
                    {wedding.extra_images.map((imgUrl, i) => (
                      <a key={i} href={imgUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                        <img
                          src={imgUrl}
                          alt={`Gallery ${i + 1}`}
                          style={{ width: "68px", height: "68px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)" }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Entrance Passcode */}
              <div className="qr-preview-box" style={{ width: '100%', boxSizing: 'border-box' }}>
                <div className="qr-code-wrapper">
                  <QRCodeSVG
                    value={previewGuest.invite.invitation_url}
                    size={150}
                    level="H"
                  />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 600 }}>
                  Personal Guest Digital Access Passcode
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
