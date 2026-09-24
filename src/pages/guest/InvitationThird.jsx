import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./InvitationThird.css";

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
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear(), month = d.getMonth(), weddingDay = d.getDate();
  const monthName = d.toLocaleString("en-US", { month: "long" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  return { cells, monthName, year, weddingDay };
}

function Countdown({ targetDate }) {
  const calcTime = () => {
    const diff = new Date(targetDate + "T00:00:00") - new Date();
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

  return (
    <div className="f3-countdown">
      {[
        { val: time.days, label: "Days" },
        { val: time.hours, label: "Hours" },
        { val: time.minutes, label: "Mins" },
        { val: time.seconds, label: "Secs" },
      ].map((u) => (
        <div key={u.label} className="f3-cd-box">
          <span className="f3-cd-num">{String(u.val).padStart(2, "0")}</span>
          <span className="f3-cd-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function InvitationThird({ invite, wedding, guest }) {
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
    ? wedding.wedding_date.split("-").reverse().join(" · ")
    : "";

  const defaultMessage =
    "True love stories never have endings. Together with their cherished families, they request the honour of your presence.";

  const bannerImage =
    wedding.image_url ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80";

  return (
    <div className="f3-page">
      {/* Full-screen image banner */}
      <div className="f3-image-banner">
        <img
          src={bannerImage}
          alt={`${wedding.bride_name} & ${wedding.groom_name}`}
          className="f3-image-banner-img"
        />
        <div className="f3-image-banner-overlay">
          <div className="f3-image-banner-top">
            <span className="f3-monogram f3-monogram--banner">
              {wedding.bride_name?.[0] || "B"} & {wedding.groom_name?.[0] || "G"}
            </span>
            <p className="f3-eyebrow f3-eyebrow--banner">The Wedding Celebration of</p>
          </div>
          <div className="f3-image-banner-bottom">
            <h1 className="f3-names">
              {wedding.bride_name}
              <span className="f3-and">&</span>
              {wedding.groom_name}
            </h1>
          </div>
        </div>
      </div>

      <div className="f3-card-container">
        {/* Upper Corner Wedding Flowers */}
        {/* <div className="f3-corner-flower f3-corner-top-left" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="f3-corner-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            <path d="M8 8 Q35 15 45 40 Q25 35 8 8Z" fill="#d8c5b0" opacity="0.8"/>
            <path d="M8 8 Q15 35 40 45 Q35 25 8 8Z" fill="#e2d4c3" opacity="0.85"/>
            <path d="M12 12 Q50 8 65 24 Q45 32 12 12Z" fill="#d2bea8" opacity="0.7"/>
            <path d="M12 12 Q8 50 24 65 Q32 45 12 12Z" fill="#d2bea8" opacity="0.7"/>

            
            <path d="M5 5 Q40 20 75 15" stroke="#bfa181" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            <path d="M5 5 Q20 40 15 75" stroke="#bfa181" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>

            
            <circle cx="70" cy="16" r="3" fill="#bfa181"/>
            <circle cx="16" cy="70" r="3" fill="#bfa181"/>
            <circle cx="55" cy="35" r="2.5" fill="#dfc8b3"/>
            <circle cx="35" cy="55" r="2.5" fill="#dfc8b3"/>

           
            <g transform="translate(24, 24)">
              <circle cx="0" cy="0" r="16" fill="#fffaf5" stroke="#c8ab8d" strokeWidth="1.2"/>
              <path d="M-9 -3 C-13 -11, -3 -14, 0 -9 C3 -14, 13 -11, 9 -3 C13 4, 6 12, 0 9 C-6 12, -13 4, -9 -3 Z" fill="#eedecf" stroke="#bfa181" strokeWidth="0.8"/>
              <path d="M-6 -2 C-9 -7, -2 -9, 0 -6 C2 -9, 9 -7, 6 -2 C9 2, 4 8, 0 6 C-4 8, -9 2, -6 -2 Z" fill="#dfc8b3" stroke="#bfa181" strokeWidth="0.6"/>
              <circle cx="0" cy="0" r="3.5" fill="#bfa181"/>
            </g>
          </svg>
        </div> */}

        {/* <div className="f3-corner-flower f3-corner-top-right" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="f3-corner-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            
            <path d="M92 8 Q65 15 55 40 Q75 35 92 8Z" fill="#d8c5b0" opacity="0.8"/>
            <path d="M92 8 Q85 35 60 45 Q65 25 92 8Z" fill="#e2d4c3" opacity="0.85"/>
            <path d="M88 12 Q50 8 35 24 Q55 32 88 12Z" fill="#d2bea8" opacity="0.7"/>
            <path d="M88 12 Q92 50 76 65 Q68 45 88 12Z" fill="#d2bea8" opacity="0.7"/>

          
            <path d="M95 5 Q60 20 25 15" stroke="#bfa181" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            <path d="M95 5 Q80 40 85 75" stroke="#bfa181" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>

           
            <circle cx="30" cy="16" r="3" fill="#bfa181"/>
            <circle cx="84" cy="70" r="3" fill="#bfa181"/>
            <circle cx="45" cy="35" r="2.5" fill="#dfc8b3"/>
            <circle cx="65" cy="55" r="2.5" fill="#dfc8b3"/>

            
            <g transform="translate(76, 24)">
              <circle cx="0" cy="0" r="16" fill="#fffaf5" stroke="#c8ab8d" strokeWidth="1.2"/>
              <path d="M-9 -3 C-13 -11, -3 -14, 0 -9 C3 -14, 13 -11, 9 -3 C13 4, 6 12, 0 9 C-6 12, -13 4, -9 -3 Z" fill="#eedecf" stroke="#bfa181" strokeWidth="0.8"/>
              <path d="M-6 -2 C-9 -7, -2 -9, 0 -6 C2 -9, 9 -7, 6 -2 C9 2, 4 8, 0 6 C-4 8, -9 2, -6 -2 Z" fill="#dfc8b3" stroke="#bfa181" strokeWidth="0.6"/>
              <circle cx="0" cy="0" r="3.5" fill="#bfa181"/>
            </g>
          </svg>
        </div> */}

        {/* Subtle decorative inner border */}
        <div className="f3-inner-border">
          {/* Guest Greeting */}
          <div className="f3-guest-box">
            <span className="f3-guest-tag">Cordially Invited</span>
            <h2 className="f3-guest-name">{guest?.full_name || "Honoured Guest"}</h2>
            <p className="f3-invitation-message">{wedding.message || defaultMessage}</p>
            {/* Image Slideshow */}
            {wedding.extra_images && wedding.extra_images.length > 0 && (
              <div className="f3-image-slideshow" style={{ display: "flex", overflowX: "auto", gap: "0.5rem", marginTop: "1rem" }}>
                {wedding.extra_images.map((url, idx) => (
                  <img key={idx} src={url} alt={`Extra ${idx + 1}`} style={{ maxHeight: "200px", borderRadius: "0.5rem" }} />
                ))}
              </div>
            )}
          </div>

          {/* Countdown */}
          {wedding.wedding_date && (
            <div className="f3-section">
              <p className="f3-section-title">The Countdown</p>
              <Countdown targetDate={wedding.wedding_date} />
            </div>
          )}

          {/* Calendar */}
          {calendar && (
            <div className="f3-section">
              <p className="f3-section-title">Save The Date</p>
              <h3 className="f3-cal-month">{calendar.monthName} {calendar.year}</h3>
              <div className="f3-calendar">
                <div className="f3-cal-weekdays">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={i} className="f3-cal-wd">{d}</span>
                  ))}
                </div>
                <div className="f3-cal-days">
                  {calendar.cells.map((day, idx) => (
                    <div
                      key={idx}
                      className={`f3-cal-day${day === null ? " empty" : ""}${
                        day === calendar.weddingDay ? " f3-wedding-day" : ""
                      }`}
                    >
                      {day !== null ? day : ""}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Venue & Event Schedule */}
          <div className="f3-section f3-venue-box">
            <p className="f3-section-title">Date & Place</p>
            <h3 className="f3-venue-name">{wedding.location_name}</h3>
            {wedding.location_address && (
              <p className="f3-venue-address">{wedding.location_address}</p>
            )}

            <div className="f3-schedule-grid">
              <div className="f3-sched-card">
                <span className="f3-sched-type">Ceremony</span>
                <span className="f3-sched-time">{ceremonyTime}</span>
              </div>
              <div className="f3-sched-card">
                <span className="f3-sched-type">Reception</span>
                <span className="f3-sched-time">{receptionTime}</span>
              </div>
              <div className="f3-sched-card">
                <span className="f3-sched-type">Attire</span>
                <span className="f3-sched-time">Black Tie</span>
              </div>
            </div>

            {mapLink && (
              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="f3-map-btn">
                View Location Map
              </a>
            )}
          </div>

          {/* QR Passcode */}
          <div className="f3-section f3-qr-box">
            <p className="f3-section-title">Personal Entry Pass</p>
            <div className="f3-qr-wrapper">
              <QRCodeSVG value={qrValue} size={150} level="H" fgColor="#1e293b" />
            </div>
            <p className="f3-qr-text">
              Please present this badge at the venue entry.
            </p>
          </div>

          {/* Footer */}
          <div className="f3-footer">
          
            <p className="f3-footer-date">{footerDate}</p>
            <p className="f3-footer-names">{wedding.bride_name} &amp; {wedding.groom_name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
