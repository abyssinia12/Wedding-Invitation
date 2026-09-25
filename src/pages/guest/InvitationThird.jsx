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

  // Safely parse multiple extra images
  const galleryImages = (() => {
    let list = [];
    if (Array.isArray(wedding?.extra_images)) {
      list = wedding.extra_images;
    } else if (typeof wedding?.extra_images === "string") {
      try {
        const parsed = JSON.parse(wedding.extra_images);
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {}
    }
    if (list.length === 0 && wedding?.id) {
      try {
        const stored = localStorage.getItem(`wedding_extra_images_${wedding.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch (e) {}
    }
    return list.filter((url) => typeof url === "string" && url.trim().length > 0);
  })();

  const [activePhotoIdx, setActivePhotoIdx] = useState(null);

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
        {/* Subtle decorative inner border */}
        <div className="f3-inner-border">
          {/* Guest Greeting */}
          <div className="f3-guest-box">
            <span className="f3-guest-tag">Cordially Invited</span>
            <h2 className="f3-guest-name">{guest?.full_name || "Honoured Guest"}</h2>
            <p className="f3-invitation-message">{wedding.message || defaultMessage}</p>
          </div>

          {/* Photo Gallery Section (Multiple Images) */}
          {galleryImages.length > 0 && (
            <div className="f3-section f3-gallery-box">
              <p className="f3-section-title">Captured Moments</p>
              <h3 className="f3-gallery-title">Memories of Our Love</h3>
              <p className="f3-gallery-sub">A glimpse into the story and moments we cherish</p>
              <div className="f3-gallery-track">
                {galleryImages.map((url, idx) => (
                  <div
                    key={idx}
                    className="f3-gallery-item"
                    onClick={() => setActivePhotoIdx(idx)}
                    title="Click to view full photo"
                  >
                    <img src={url} alt={`Moment ${idx + 1}`} loading="lazy" />
                    <div className="f3-gallery-item-overlay">
                      <span>✦ View</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="f3-gallery-hint">Tap any photo to view full size ({galleryImages.length} photos)</p>
            </div>
          )}

          {/* Fullscreen Lightbox Modal */}
          {activePhotoIdx !== null && galleryImages[activePhotoIdx] && (
            <div className="f3-lightbox" onClick={() => setActivePhotoIdx(null)}>
              <div className="f3-lightbox-content" onClick={(e) => e.stopPropagation()}>
                <button
                  className="f3-lightbox-close"
                  onClick={() => setActivePhotoIdx(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
                {galleryImages.length > 1 && (
                  <>
                    <button
                      className="f3-lightbox-nav f3-lightbox-prev"
                      onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      className="f3-lightbox-nav f3-lightbox-next"
                      onClick={() => setActivePhotoIdx((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                      aria-label="Next image"
                    >
                      ›
                    </button>
                  </>
                )}
                <img
                  src={galleryImages[activePhotoIdx]}
                  alt={`Photo ${activePhotoIdx + 1}`}
                  className="f3-lightbox-img"
                />
                <div className="f3-lightbox-counter">
                  Photo {activePhotoIdx + 1} of {galleryImages.length}
                </div>
              </div>
            </div>
          )}

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
