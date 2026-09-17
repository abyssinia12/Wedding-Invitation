import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./InvitationFirst.css";

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
  const recHour = (hour + 2) % 24;
  const ampm = recHour >= 12 ? "PM" : "AM";
  const h12 = recHour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function buildCalendar(dateStr) {
  const weddingDate = new Date(dateStr + "T00:00:00");
  const year = weddingDate.getFullYear();
  const month = weddingDate.getMonth();
  const weddingDay = weddingDate.getDate();
  const monthName = weddingDate.toLocaleString("en-US", { month: "long" });
  const firstDay = new Date(year, month, 1).getDay();
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
    <div className="f1-countdown">
      {units.map((u) => (
        <div key={u.label} className="f1-countdown-box">
          <span className="f1-countdown-num">{String(u.val).padStart(2, "0")}</span>
          <span className="f1-countdown-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function InvitationFirst({ invite, wedding, guest }) {
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

  const footerDate = wedding.wedding_date
    ? wedding.wedding_date.split("-").reverse().join(" . ")
    : "";

  const defaultMessage =
    "\u201cTwo hearts, one crown, one story that begins with you beside us. Your presence would make our day a memory we treasure forever.\u201d";
  const defaultSubtext =
    "We would be honoured to have you share in our joy as we exchange vows and begin our life together, surrounded by the people we love most.";

  return (
    <div className="f1-page">
      <div className="f1-wrapper">

        {/* Floating ornaments */}
        <div className="f1-petals" aria-hidden="true">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`f1-petal f1-petal-${i + 1}`}>✦</div>
          ))}
        </div>

        {/* ── 1. Hero Header ── */}
        <div className="f1-hero-header">
          <p className="f1-tagline">Together with their families</p>
          <h1 className="f1-couple-name">
            {wedding.bride_name} & {wedding.groom_name}
          </h1>
          <span className="f1-diamond">✦</span>
          <p className="f1-invite-sub">Invite you to their wedding</p>
        </div>

        {/* ── 2. Couple Photo ── */}
        <div className="f1-photo-frame">
          <img
            src={
              wedding.image_url ||
              "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80"
            }
            alt={`${wedding.bride_name} & ${wedding.groom_name}`}
          />
        </div>

        {/* ── 3. Honoured Guest Card ── */}
        <div className="f1-guest-card">
          <p className="f1-reserved-label">This invitation is reserved for</p>
          <h2 className="f1-honoured-guest">Our Honoured Guest</h2>
          {guest?.full_name && (
            <p className="f1-guest-name">{guest.full_name}</p>
          )}
          <div className="f1-guest-divider" />
          <p className="f1-quote">{wedding.message || defaultMessage}</p>
          <p className="f1-subtext">{defaultSubtext}</p>
        </div>

        {/* ── 4. Countdown ── */}
        {wedding.wedding_date && <Countdown targetDate={wedding.wedding_date} />}

        {/* ── 5. Save the Date Calendar ── */}
        {calendar && (
          <div className="f1-calendar-wrap">
            <p className="f1-save-label">Save the Date</p>
            <p className="f1-cal-month">
              {calendar.monthName} {calendar.year}
            </p>
            <div className="f1-cal-divider">
              <span className="f1-cal-divider-diamond">✦</span>
            </div>
            <div className="f1-calendar">
              <div className="f1-cal-weekdays">
                {["SU", "MO", "TU", "WE", "TH", "FR", "SA"].map((d) => (
                  <span key={d} className="f1-cal-wd">{d}</span>
                ))}
              </div>
              <div className="f1-cal-days">
                {calendar.cells.map((day, idx) => (
                  <div
                    key={idx}
                    className={`f1-cal-day${day === null ? " empty" : ""}${
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
        <div className="f1-venue-card">
          <p className="f1-venue-label">The Venue</p>
          <h3 className="f1-venue-name">{wedding.location_name}</h3>
          {wedding.location_address && (
            <p className="f1-venue-address">{wedding.location_address}</p>
          )}
          <div className="f1-venue-divider"><span>✦</span></div>
          <div className="f1-event-pills">
            <div className="f1-event-pill">
              <span className="f1-pill-label">Ceremony</span>
              <span className="f1-pill-value">{ceremonyTime}</span>
            </div>
            <div className="f1-event-pill">
              <span className="f1-pill-label">Reception</span>
              <span className="f1-pill-value">{receptionTime}</span>
            </div>
            <div className="f1-event-pill">
              <span className="f1-pill-label">Dress Code</span>
              <span className="f1-pill-value">Traditional / Formal</span>
            </div>
          </div>
          {mapLink && (
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="f1-map-btn">
              View on map
            </a>
          )}
        </div>

        {/* ── 7. QR Entry Pass ── */}
        <div className="f1-qr-card">
          <p className="f1-qr-label">Your Entry Pass</p>
          <h3 className="f1-qr-title">Scan at the door</h3>
          <div className="f1-qr-box">
            <QRCodeSVG value={qrValue} size={160} level="H" />
          </div>
          <p className="f1-qr-note">
            Personal invitation for {guest.full_name}.
          </p>
        </div>

        {/* ── 8. Footer Signature ── */}
        <div className="f1-footer-sig">
          <div className="f1-footer-divider"><span>✦</span></div>
          <p className="f1-footer-names">
            {wedding.bride_name} & {wedding.groom_name}
          </p>
          <p className="f1-footer-date">{footerDate}</p>
        </div>

      </div>
    </div>
  );
}
