import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./InvitationSecond.css";

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
    <div className="f2-countdown">
      {[
        { val: time.days, label: "Days" },
        { val: time.hours, label: "Hours" },
        { val: time.minutes, label: "Mins" },
        { val: time.seconds, label: "Secs" },
      ].map((u) => (
        <div key={u.label} className="f2-cd-box">
          <span className="f2-cd-num">{String(u.val).padStart(2, "0")}</span>
          <span className="f2-cd-label">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Botanical leaf SVG ornament ── */
function LeafDivider() {
  return (
    <div className="f2-leaf-divider">
      <span className="f2-leaf-line" />
      <span className="f2-leaf-icon">🌿</span>
      <span className="f2-leaf-line" />
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function InvitationSecond({ invite, wedding, guest }) {
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
    "In the garden of life, love is the most beautiful flower. We invite you to witness ours bloom.";

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
    <div className="f2-page">

      {/* Background bokeh circles */}
      <div className="f2-bokeh" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`f2-bokeh-circle f2-bc-${i + 1}`} />
        ))}
      </div>

      <div className="f2-wrapper">

        {/* ── Image banner (groom & bride at bottom) ── */}
        <div className="f2-image-banner">
          <img
            src={bannerImage}
            alt={`${wedding.bride_name} & ${wedding.groom_name}`}
          />
          <div className="f2-image-banner-overlay">
            <div className="f2-image-banner-top">
              <p className="f2-banner-sub">A Celebration of Love</p>
              <p className="f2-hero-eyebrow">Together with joy & love</p>
            </div>
            <div className="f2-image-banner-bottom">
              <h1 className="f2-couple-name">
                {wedding.bride_name}
                <span className="f2-ampersand"> & </span>
                {wedding.groom_name}
              </h1>
            </div>
          </div>
        </div>

        <LeafDivider />

        {/* ── Guest Card ── */}
        <div className="f2-guest-section">
          <p className="f2-section-eyebrow">Personal Invitation For</p>
          <div className="f2-guest-name-wrap">
            <div className="f2-guest-name-badge">
              {guest?.full_name || "Honoured Guest"}
            </div>
          </div>
          <p className="f2-guest-message">{wedding.message || defaultMessage}</p>
          <p className="f2-guest-sub">
            Your presence is our greatest gift. We look forward to celebrating this joyous occasion with you, surrounded by the warmth of family and the beauty of love.
          </p>
        </div>

        {/* ── Photo Gallery Section (Multiple Images) ── */}
        {galleryImages.length > 0 && (
          <>
            <div className="f2-gallery-section">
              <p className="f2-section-eyebrow">A Glimpse of Our Journey</p>
              <h3 className="f2-gallery-title">Moments of Love</h3>
              <p className="f2-gallery-sub">Cherished snapshots of our story together</p>

              <div className="f2-gallery-track">
                {galleryImages.map((url, idx) => (
                  <div
                    key={idx}
                    className="f2-gallery-item"
                    onClick={() => setActivePhotoIdx(idx)}
                    title="Click to view photo"
                  >
                    <img src={url} alt={`Moment ${idx + 1}`} loading="lazy" />
                    <div className="f2-gallery-item-overlay">
                      <span>🌿 View Photo</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="f2-gallery-hint">Tap any photo to expand ({galleryImages.length} photos)</p>
            </div>

            <LeafDivider />
          </>
        )}

        {/* Fullscreen Lightbox Modal */}
        {activePhotoIdx !== null && galleryImages[activePhotoIdx] && (
          <div className="f2-lightbox" onClick={() => setActivePhotoIdx(null)}>
            <div className="f2-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="f2-lightbox-close"
                onClick={() => setActivePhotoIdx(null)}
                aria-label="Close"
              >
                ✕
              </button>
              {galleryImages.length > 1 && (
                <>
                  <button
                    className="f2-lightbox-nav f2-lightbox-prev"
                    onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    className="f2-lightbox-nav f2-lightbox-next"
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
                className="f2-lightbox-img"
              />
              <div className="f2-lightbox-counter">
                Photo {activePhotoIdx + 1} of {galleryImages.length}
              </div>
            </div>
          </div>
        )}

        {/* ── Countdown ── */}
        {wedding.wedding_date && (
          <div className="f2-countdown-section">
            <p className="f2-section-eyebrow">Counting Down to Forever</p>
            <Countdown targetDate={wedding.wedding_date} />
          </div>
        )}

        <LeafDivider />

        {/* ── Calendar ── */}
        {calendar && (
          <div className="f2-cal-section">
            <p className="f2-section-eyebrow">Save the Date</p>
            <h2 className="f2-cal-month-title">{calendar.monthName} {calendar.year}</h2>
            <div className="f2-calendar">
              <div className="f2-cal-weekdays">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                  <span key={d} className="f2-cal-wd">{d}</span>
                ))}
              </div>
              <div className="f2-cal-days">
                {calendar.cells.map((day, idx) => (
                  <div
                    key={idx}
                    className={`f2-cal-day${day === null ? " empty" : ""}${
                      day === calendar.weddingDay ? " f2-wedding-day" : ""
                    }`}
                  >
                    {day !== null ? day : ""}
                    {day === calendar.weddingDay && <span className="f2-day-dot" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Venue ── */}
        <div className="f2-venue-section">
          <p className="f2-section-eyebrow">The Venue</p>
          <h3 className="f2-venue-name">{wedding.location_name}</h3>
          {wedding.location_address && (
            <p className="f2-venue-address">📍 {wedding.location_address}</p>
          )}
          <div className="f2-event-row">
            <div className="f2-event-item">
              {/* <span className="f2-event-icon">💍</span> */}
              <span className="f2-event-title">Ceremony</span>
              <span className="f2-event-time">{ceremonyTime}</span>
            </div>
            <div className="f2-event-divider" />
            <div className="f2-event-item">
              {/* <span className="f2-event-icon">🥂</span> */}
              <span className="f2-event-title">Reception</span>
              <span className="f2-event-time">{receptionTime}</span>
            </div>
            <div className="f2-event-divider" />
            <div className="f2-event-item">
              {/* <span className="f2-event-icon">👗</span> */}
              <span className="f2-event-title">Dress Code</span>
              <span className="f2-event-time">Formal</span>
            </div>
          </div>
          {mapLink && (
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="f2-map-btn">
              🗺 Open in Maps
            </a>
          )}
        </div>

        <LeafDivider />

        {/* ── QR Card ── */}
        <div className="f2-qr-section">
          <p className="f2-section-eyebrow">Your Digital Entry Pass</p>
          <div className="f2-qr-frame">
            <QRCodeSVG value={qrValue} size={155} level="H" fgColor="#1a3a2a" />
          </div>
          <p className="f2-qr-desc">
            Reserved exclusively for{" "}
            <strong>{guest.full_name}</strong>.
          </p>
        </div>

        {/* ── Footer ── */}
        <div className="f2-footer">
          {/* <div className="f2-footer-leaves">🌿 🌸 🌿</div> */}
          <p className="f2-footer-names">
            {wedding.bride_name} & {wedding.groom_name}
          </p>
          <p className="f2-footer-date">{footerDate}</p>
          <p className="f2-footer-tag">With Love ♡</p>
        </div>

      </div>
    </div>
  );
}
