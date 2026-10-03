import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../../lib/supabase";
import "./CheckIn.css";

// Synthesize pleasant check-in success sound via Web Audio API
function playCheckInChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // Audio context may be restricted before interaction
  }
}

function formatTime(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function CheckIn() {
  const { weddingId } = useParams();
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [wedding, setWedding] = useState(null);
  const [guests, setGuests] = useState([]);
  const [invitationsMap, setInvitationsMap] = useState({}); // guest_id -> invitation
  const [checkins, setCheckins] = useState({}); // guest_id -> { checked_in: boolean, checked_in_at: string }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'pending' | 'checked_in'
  const [recentCheckedGuest, setRecentCheckedGuest] = useState(null);

  // QR Scanner states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [scannerError, setScannerError] = useState(null);
  const html5QrCodeRef = useRef(null);
  const scannerContainerId = "qr-reader-container";

  useEffect(() => {
    fetchWeddingAndGuests();
  }, [weddingId]);

  // Load checkins from localStorage on weddingId change
  useEffect(() => {
    if (!weddingId) return;
    try {
      const stored = localStorage.getItem(`wedding_checkins_${weddingId}`);
      if (stored) {
        setCheckins(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load local checkins", e);
    }
  }, [weddingId]);

  // Handle QR scanner start/stop
  useEffect(() => {
    if (scannerOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [scannerOpen]);

  const fetchWeddingAndGuests = async () => {
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

      // Fetch Wedding
      const { data: weddingData, error: weddingErr } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", weddingId)
        .eq("admin_id", adminData.id)
        .single();

      if (weddingErr || !weddingData) {
        setError("Wedding event not found or access denied.");
        return;
      }
      setWedding(weddingData);

      // Fetch Guests
      const { data: guestList, error: guestErr } = await supabase
        .from("guests")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: false });

      if (guestErr) throw new Error(guestErr.message);
      setGuests(guestList || []);

      // Fetch Invitations to map tokens
      const { data: inviteList } = await supabase
        .from("invitations")
        .select("*")
        .eq("wedding_id", weddingId);

      const invMap = {};
      if (inviteList) {
        inviteList.forEach((inv) => {
          invMap[inv.guest_id] = inv;
        });
      }
      setInvitationsMap(invMap);

      // Sync checkins from DB if guest has checked_in column
      const initialCheckins = {};
      if (guestList) {
        guestList.forEach((g) => {
          if (g.checked_in || g.status === "checked_in") {
            initialCheckins[g.id] = {
              checked_in: true,
              checked_in_at: g.checked_in_at || g.updated_at || new Date().toISOString(),
            };
          }
        });
      }

      // Merge with localStorage
      const localStored = localStorage.getItem(`wedding_checkins_${weddingId}`);
      let merged = { ...initialCheckins };
      if (localStored) {
        try {
          const parsed = JSON.parse(localStored);
          merged = { ...merged, ...parsed };
        } catch (e) {}
      }
      setCheckins(merged);
    } catch (err) {
      console.error("CheckIn fetch error:", err);
      setError("An error occurred while loading guests for check-in.");
    } finally {
      setLoading(false);
    }
  };

  const saveCheckinsState = (updated) => {
    setCheckins(updated);
    try {
      localStorage.setItem(`wedding_checkins_${weddingId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
  };

  const handleToggleCheckIn = async (guestId) => {
    const isCurrentlyChecked = !!checkins[guestId]?.checked_in;
    const newStatus = !isCurrentlyChecked;
    const nowIso = new Date().toISOString();

    const updated = {
      ...checkins,
      [guestId]: {
        checked_in: newStatus,
        checked_in_at: newStatus ? nowIso : null,
      },
    };

    saveCheckinsState(updated);

    const guestObj = guests.find((g) => g.id === guestId);

    if (newStatus) {
      playCheckInChime();
      setRecentCheckedGuest({
        guest: guestObj,
        time: formatTime(nowIso),
        action: "checked_in",
      });
      setTimeout(() => setRecentCheckedGuest(null), 5000);
    }

    // Attempt to persist to Supabase if column exists
    try {
      await supabase
        .from("guests")
        .update({
          checked_in: newStatus,
          checked_in_at: newStatus ? nowIso : null,
          updated_at: nowIso,
        })
        .eq("id", guestId)
        .eq("wedding_id", weddingId);
    } catch (e) {
      // Column might not exist in Supabase table; local storage fallback is already active
    }
  };

  // QR Code Camera Scanner controls
  const startScanner = async () => {
    setScannerError(null);
    try {
      const qrScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrScanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await qrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleScannedData(decodedText);
        },
        () => {
          // Ignore scanning frame errors
        }
      );
    } catch (err) {
      console.error("Camera scanner error:", err);
      setScannerError("Camera access denied or unavailable. You can enter the token below.");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Scanner might already be stopped
      }
      html5QrCodeRef.current = null;
    }
  };

  const handleScannedData = (rawText) => {
    if (!rawText) return;

    // The QR contains either full URL `${origin}/invite/${token}` or just the token
    let token = rawText.trim();
    if (token.includes("/invite/")) {
      const parts = token.split("/invite/");
      token = parts[1].split("?")[0].split("#")[0].trim();
    }

    // Look for matching invitation
    const matchingGuestId = Object.keys(invitationsMap).find((gid) => {
      const inv = invitationsMap[gid];
      return inv?.token === token;
    });

    if (matchingGuestId) {
      const guestObj = guests.find((g) => g.id === matchingGuestId);
      const isAlreadyChecked = checkins[matchingGuestId]?.checked_in;

      if (!isAlreadyChecked) {
        handleToggleCheckIn(matchingGuestId);
      } else {
        setRecentCheckedGuest({
          guest: guestObj,
          time: formatTime(checkins[matchingGuestId]?.checked_in_at),
          action: "already_checked",
        });
        setTimeout(() => setRecentCheckedGuest(null), 5000);
      }
      setScannerOpen(false);
    } else {
      setScannerError(`No matching invitation found for code: "${token.substring(0, 15)}..."`);
    }
  };

  const handleManualTokenSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleScannedData(manualToken);
    setManualToken("");
  };

  // Filtered guest list
  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    const inv = invitationsMap[g.id];
    const isChecked = !!checkins[g.id]?.checked_in;

    // Filter tab
    if (filterTab === "pending" && isChecked) return false;
    if (filterTab === "checked_in" && !isChecked) return false;

    // Search query
    if (!q) return true;
    const nameMatch = g.full_name?.toLowerCase().includes(q);
    const phoneMatch = g.phone?.toLowerCase().includes(q);
    const tokenMatch = inv?.token?.toLowerCase().includes(q);
    return nameMatch || phoneMatch || tokenMatch;
  });

  // Calculate live stats
  const totalGuests = guests.length;
  const totalPartyExpected = guests.reduce((sum, g) => sum + (parseInt(g.guest_count, 10) || 1), 0);

  const checkedCount = guests.filter((g) => !!checkins[g.id]?.checked_in).length;
  const checkedPartyCount = guests
    .filter((g) => !!checkins[g.id]?.checked_in)
    .reduce((sum, g) => sum + (parseInt(g.guest_count, 10) || 1), 0);

  const pendingCount = totalGuests - checkedCount;
  const checkInPercentage = totalGuests > 0 ? Math.round((checkedCount / totalGuests) * 100) : 0;

  if (loading) {
    return (
      <div className="checkin-loading-screen">
        <div className="checkin-spinner" />
        <p>Loading Wedding Check-in Desk…</p>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="checkin-error-screen">
        <span className="checkin-error-icon">⚠️</span>
        <h2>{error || "Wedding event could not be found."}</h2>
        <Link to="/admin/weddings" className="btn-secondary">
          ← Back to Weddings
        </Link>
      </div>
    );
  }

  return (
    <div className="checkin-page">
      {/* ── Top Header ── */}
      <div className="checkin-header">
        <div className="checkin-header-left">
          <Link to={`/admin/wedding/${weddingId}/guests`} className="checkin-back-link">
            ← Back to Guests
          </Link>
          <div className="checkin-title-wrap">
            <h1 className="checkin-title">
              Guest Check-In Desk
            </h1>
            <div className="checkin-wedding-badge">
              <span className="checkin-wedding-couple">
                💍 {wedding.bride_name} & {wedding.groom_name}
              </span>
              {wedding.wedding_date && (
                <span className="checkin-wedding-date">
                  📅 {wedding.wedding_date} {wedding.wedding_time ? `• ${wedding.wedding_time.slice(0, 5)}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="checkin-header-actions">
          <button
            type="button"
            className={`btn-scan-qr ${scannerOpen ? "active" : ""}`}
            onClick={() => setScannerOpen(!scannerOpen)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h3v3h-3zM19 19h2v2h-2z" />
            </svg>
            {scannerOpen ? "Close Scanner" : "Scan Guest QR Code"}
          </button>
        </div>
      </div>

      {/* ── Success Toast Banner ── */}
      {recentCheckedGuest && (
        <div className={`checkin-toast ${recentCheckedGuest.action}`}>
          <div className="checkin-toast-content">
            <span className="checkin-toast-icon">
              {recentCheckedGuest.action === "checked_in" ? "🎉" : "ℹ️"}
            </span>
            <div>
              <strong className="checkin-toast-name">
                {recentCheckedGuest.guest?.full_name}
              </strong>
              <p className="checkin-toast-sub">
                {recentCheckedGuest.action === "checked_in"
                  ? `Successfully checked in party of ${recentCheckedGuest.guest?.guest_count || 1} at ${recentCheckedGuest.time}`
                  : `Already checked in at ${recentCheckedGuest.time}`}
              </p>
            </div>
          </div>
          <button
            className="checkin-toast-close"
            onClick={() => setRecentCheckedGuest(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── QR Scanner Card Modal / Section ── */}
      {scannerOpen && (
        <div className="checkin-scanner-box">
          <div className="checkin-scanner-head">
            <div>
              <h3>Camera QR Scanner</h3>
              <p>Point camera at the guest's wedding invitation QR code</p>
            </div>
            <button
              className="btn-close-scanner"
              onClick={() => setScannerOpen(false)}
            >
              ✕
            </button>
          </div>

          <div id={scannerContainerId} className="checkin-qr-viewport" />

          {scannerError && (
            <div className="checkin-scanner-alert">
              <span>⚠️ {scannerError}</span>
            </div>
          )}

          {/* Manual Token Fallback */}
          <form onSubmit={handleManualTokenSubmit} className="checkin-manual-token-form">
            <input
              type="text"
              placeholder="Or paste invitation URL / token..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="checkin-manual-input"
            />
            <button type="submit" className="btn-manual-submit">
              Check In
            </button>
          </form>
        </div>
      )}

      {/* ── Live Stats Cards ── */}
      <div className="checkin-stats-grid">
        <div className="checkin-stat-card primary">
          <div className="stat-label">Checked In Guests</div>
          <div className="stat-num">
            {checkedCount} <span className="stat-total">/ {totalGuests}</span>
          </div>
          <div className="stat-sub">
            {checkInPercentage}% of guests arrived
          </div>
          <div className="stat-progress-bar">
            <div
              className="stat-progress-fill"
              style={{ width: `${checkInPercentage}%` }}
            />
          </div>
        </div>

        <div className="checkin-stat-card success">
          <div className="stat-label">People in Attendance</div>
          <div className="stat-num">
            {checkedPartyCount} <span className="stat-total">/ {totalPartyExpected}</span>
          </div>
          <div className="stat-sub">Total seats checked in</div>
        </div>

        <div className="checkin-stat-card warning">
          <div className="stat-label">Pending Arrival</div>
          <div className="stat-num">{pendingCount}</div>
          <div className="stat-sub">Invitations still unconfirmed</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="checkin-controls-bar">
        <div className="checkin-search-wrap">
          <svg
            className="checkin-search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search guest by name, phone, or token..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="checkin-search-input"
          />
          {searchQuery && (
            <button
              className="checkin-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="checkin-filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All Guests ({totalGuests})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterTab === "pending" ? "active" : ""}`}
            onClick={() => setFilterTab("pending")}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterTab === "checked_in" ? "active" : ""}`}
            onClick={() => setFilterTab("checked_in")}
          >
            Checked In ({checkedCount})
          </button>
        </div>
      </div>

      {/* ── Guests Check-In Table / Cards ── */}
      <div className="checkin-table-container">
        {filteredGuests.length === 0 ? (
          <div className="checkin-empty">
            <span style={{ fontSize: "2.5rem" }}>👥</span>
            <h3>No guests found</h3>
            <p>
              {searchQuery
                ? `No guests match "${searchQuery}". Try a different name.`
                : "No guests match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="checkin-list">
            {filteredGuests.map((g) => {
              const isChecked = !!checkins[g.id]?.checked_in;
              const checkInTime = checkins[g.id]?.checked_in_at;
              const inv = invitationsMap[g.id];

              return (
                <div
                  key={g.id}
                  className={`checkin-item ${isChecked ? "is-checked-in" : ""}`}
                >
                  <div className="checkin-item-left">
                    <div className="checkin-item-status-icon">
                      {isChecked ? (
                        <span className="icon-badge-checked">✓</span>
                      ) : (
                        <span className="icon-badge-pending">⏳</span>
                      )}
                    </div>
                    <div className="checkin-item-details">
                      <div className="checkin-item-name-row">
                        <span className="checkin-item-name">{g.full_name}</span>
                        <span className="checkin-party-pill">
                          Party of {g.guest_count || 1}
                        </span>
                      </div>
                      <div className="checkin-item-meta">
                        {g.phone && <span className="checkin-phone">📞 {g.phone}</span>}
                        {inv?.token && (
                          <span className="checkin-token-code" title="Invitation Token">
                            Token: {inv.token.slice(0, 14)}…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="checkin-item-right">
                    {isChecked ? (
                      <div className="checkin-checked-status-wrap">
                        <div className="checkin-time-badge">
                          <span>Checked in at {formatTime(checkInTime)}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-undo-checkin"
                          onClick={() => handleToggleCheckIn(g.id)}
                          title="Undo check-in"
                        >
                          Undo
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-checkin-action"
                        onClick={() => handleToggleCheckIn(g.id)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Check In
                      </button>
                    )}
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
