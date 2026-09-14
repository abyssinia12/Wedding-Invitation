import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../lib/supabase";
import "./PublicInvitation.css";

/* ── Helpers ─────────────────────────────────────────── */
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getReceptionTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  // Reception is typically 2–2.5 h after ceremony
  const recHour = (hour + 2) % 24;
  const ampm = recHour >= 12 ? "PM" : "AM";
  const h12 = recHour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function buildCalendar(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const weddingDate = new Date(dateStr + "T00:00:00");
  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth(); // 0-indexed
  const weddingDay = weddingDate.getDate();

  const monthName = weddingDate.toLocaleString("en-US", { month: "long" });

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return { cells, monthName, year, weddingDay };
}

function Countdown({ targetDate }) {
  const calcTime = () => {
    const now = new Date();
    const target = new Date(targetDate + "T00:00:00");
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calcTime);
  useEffect(() => {
    const id = setInterval(() => setTime(calcTime()), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const units = [
    { val: time.days, label: "Days" },
    { val: time.hours, label: "Hours" },
    { val: time.minutes, label: "Minutes" },
    { val: time.seconds, label: "Seconds" },
  ];

  return (
    <div className="pi-countdown">
      {units.map((u) => (
        <div key={u.label} className="pi-countdown-box">
          <span className="pi-countdown-num">{String(u.val).padStart(2, "0")}</span>
          <span className="pi-countdown-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function PublicInvitation() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);

  useEffect(() => {
    fetchPersonalizedInvitation();
  }, [token]);

  const fetchPersonalizedInvitation = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: invite, error: inviteErr } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (inviteErr || !invite) {
        setError("Invalid or expired invitation token.");
        return;
      }

      const { data: wedding, error: weddingErr } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", invite.wedding_id)
        .single();

      if (weddingErr || !wedding) {
        setError("Wedding details could not be found.");
        return;
      }

      const { data: guest, error: guestErr } = await supabase
        .from("guests")
        .select("*")
        .eq("id", invite.guest_id)
        .single();

      if (guestErr || !guest) {
        setError("Guest details could not be found.");
        return;
      }

      setInvitationData({ invite, wedding, guest });
    } catch (err) {
      console.error("Fetch public invitation error:", err);
      setError("An unexpected error occurred while loading your invitation.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="pi-loading">
        <div className="pi-spinner" />
        <span>Opening your invitation…</span>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !invitationData) {
    return (
      <div className="pi-error">
        <span style={{ fontSize: "2.5rem" }}>✉️</span>
        <span>{error || "Unable to display invitation."}</span>
      </div>
    );
  }

  const { invite, wedding, guest } = invitationData;

  const mapLink =
    wedding.latitude && wedding.longitude
      ? `https://maps.google.com/?q=${wedding.latitude},${wedding.longitude}`
      : wedding.location_address
      ? `https://maps.google.com/?q=${encodeURIComponent(wedding.location_address)}`
      : null;

  const ceremonyTime = formatTime12h(wedding.wedding_time);
  const receptionTime = getReceptionTime(wedding.wedding_time);

  const calendar = wedding.wedding_date ? buildCalendar(wedding.wedding_date) : null;

  const qrValue = `${window.location.origin}/invite/${invite.token}`;

  // Footer date: DD . MM . YYYY
  const footerDate = wedding.wedding_date
    ? wedding.wedding_date.split("-").reverse().join(" . ")
    : "";

  const defaultMessage =
    "\u201cTwo hearts, one crown, one story that begins with you beside us. Your presence would make our day a memory we treasure forever.\u201d";
  const defaultSubtext =
    "We would be honoured to have you share in our joy as we exchange vows and begin our life together, surrounded by the people we love most.";

  return (
    <div className="pi-page">
      <div className="pi-wrapper">

        {/* ── 1. Hero Header ── */}
        <div className="pi-hero-header">
          <p className="pi-tagline">Together with their families</p>
          <h1 className="pi-couple-name">
            {wedding.bride_name} &amp; {wedding.groom_name}
          </h1>
          <span className="pi-diamond">✦</span>
          <p className="pi-invite-sub">Invite you to their wedding</p>
        </div>

        {/* ── 2. Couple Photo ── */}
        <div className="pi-photo-frame">
          <img
            src={
              wedding.image_url ||
              "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80"
            }
            alt={`${wedding.bride_name} & ${wedding.groom_name}`}
          />
        </div>

        {/* ── 3. Honoured Guest Card ── */}
        <div className="pi-guest-card">
          <p className="pi-reserved-label">This invitation is reserved for</p>
          <h2 className="pi-honoured-guest">Our Honoured Guest</h2>
          <div className="pi-guest-divider" />
          <p className="pi-quote">{wedding.message || defaultMessage}</p>
          <p className="pi-subtext">{defaultSubtext}</p>
        </div>

        {/* ── 4. Countdown ── */}
        {wedding.wedding_date && <Countdown targetDate={wedding.wedding_date} />}

        {/* ── 5. Save the Date Calendar ── */}
        {calendar && (
          <div className="pi-calendar-wrap">
            <p className="pi-save-label">Save the Date</p>
            <p className="pi-cal-month">
              {calendar.monthName} {calendar.year}
            </p>
            <div className="pi-cal-divider">
              <span className="pi-cal-divider-diamond">✦</span>
            </div>
            <div className="pi-calendar">
              <div className="pi-cal-weekdays">
                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d) => (
                  <span key={d} className="pi-cal-wd">{d}</span>
                ))}
              </div>
              <div className="pi-cal-days">
                {calendar.cells.map((day, idx) => (
                  <div
                    key={idx}
                    className={`pi-cal-day${day === null ? " empty" : ""}${
                      day === calendar.weddingDay ? " wedding-day" : ""
                    }`}
                  >
                    {day !== null ? day : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 6. Venue ── */}
        <div className="pi-venue-card">
          <p className="pi-venue-label">The Venue</p>
          <h3 className="pi-venue-name">{wedding.location_name}</h3>
          {wedding.location_address && (
            <p className="pi-venue-address">{wedding.location_address}</p>
          )}
          <div className="pi-venue-divider"><span>✦</span></div>
          <div className="pi-event-pills">
            <div className="pi-event-pill">
              <span className="pi-pill-label">Ceremony</span>
              <span className="pi-pill-value">{ceremonyTime}</span>
            </div>
            <div className="pi-event-pill">
              <span className="pi-pill-label">Reception</span>
              <span className="pi-pill-value">{receptionTime}</span>
            </div>
            <div className="pi-event-pill">
              <span className="pi-pill-label">Dress Code</span>
              <span className="pi-pill-value">Traditional / Formal</span>
            </div>
          </div>
          {mapLink && (
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="pi-map-btn"
            >
              View on map
            </a>
          )}
        </div>

        {/* ── 7. QR Entry Pass ── */}
        <div className="pi-qr-card">
          <p className="pi-qr-label">Your Entry Pass</p>
          <h3 className="pi-qr-title">Scan at the door</h3>
          <div className="pi-qr-box">
            <QRCodeSVG value={qrValue} size={160} level="H" />
          </div>
          <p className="pi-qr-note">
            Show this code on arrival — it carries your personal invitation for{" "}
            {guest.full_name}.
          </p>
        </div>

        {/* ── 8. Footer Signature ── */}
        <div className="pi-footer-sig">
          <div className="pi-footer-divider"><span>✦</span></div>
          <p className="pi-footer-names">
            {wedding.bride_name} &amp; {wedding.groom_name}
          </p>
          <p className="pi-footer-date">{footerDate}</p>
        </div>

      </div>
    </div>
  );
}
