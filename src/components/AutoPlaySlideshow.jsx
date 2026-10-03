import React, { useState, useEffect, useRef } from "react";
import "./AutoPlaySlideshow.css";

export default function AutoPlaySlideshow({
  images = [],
  theme = "first", // 'first' | 'second' | 'thered'
  autoPlayInterval = 3800,
  title = "",
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const thumbnailRefs = useRef([]);

  const count = images.length;

  // Auto-play interval timer
  useEffect(() => {
    if (!isPlaying || isHovered || isLightboxOpen || count <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % count);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, isLightboxOpen, count, autoPlayInterval, currentSlide]);

  // Keep active thumbnail in view
  useEffect(() => {
    if (thumbnailRefs.current[currentSlide]) {
      thumbnailRefs.current[currentSlide].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentSlide]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        setLightboxIdx((prev) => (prev > 0 ? prev - 1 : count - 1));
      } else if (e.key === "ArrowRight") {
        setLightboxIdx((prev) => (prev < count - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, count]);

  if (!images || count === 0) return null;

  const nextSlide = (e) => {
    if (e) e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % count);
  };

  const prevSlide = (e) => {
    if (e) e.stopPropagation();
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : count - 1));
  };

  const goToSlide = (idx, e) => {
    if (e) e.stopPropagation();
    setCurrentSlide(idx);
  };

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    setIsPlaying((prev) => !prev);
  };

  const openLightboxAt = (idx, e) => {
    if (e) e.stopPropagation();
    setLightboxIdx(idx);
    setIsLightboxOpen(true);
  };

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next
        nextSlide();
      } else {
        // Swiped right -> prev
        prevSlide();
      }
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const isAutoAdvancing = isPlaying && !isHovered && !isLightboxOpen && count > 1;

  return (
    <div className={`ap-slideshow-container theme-${theme}`}>
      {/* ── Main Stage ── */}
      <div
        className="ap-stage-frame"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bar (visible only when multiple images and auto-playing) */}
        {count > 1 && (
          <div className="ap-progress-track">
            <div
              key={`${currentSlide}-${isAutoAdvancing}`}
              className={`ap-progress-bar ${isAutoAdvancing ? "active" : "paused"}`}
              style={{ animationDuration: `${autoPlayInterval}ms` }}
            />
          </div>
        )}

        {/* Top Badges / Floating Controls */}
        <div className="ap-top-controls">
          <div className="ap-counter-badge">
            <span className="ap-counter-icon">✦</span>
            <span>
              {currentSlide + 1} / {count}
            </span>
          </div>

          <div className="ap-action-buttons">
            {count > 1 && (
              <button
                type="button"
                className={`ap-action-btn ${!isPlaying ? "is-paused" : ""}`}
                onClick={togglePlay}
                title={isPlaying ? "Pause autoplay" : "Resume autoplay"}
                aria-label={isPlaying ? "Pause autoplay" : "Resume autoplay"}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="button"
              className="ap-action-btn ap-expand-btn"
              onClick={(e) => openLightboxAt(currentSlide, e)}
              title="View full screen"
              aria-label="View full screen"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Slides Viewport */}
        <div
          className="ap-viewport"
          onClick={() => openLightboxAt(currentSlide)}
          title="Click to view full size"
        >
          {images.map((url, idx) => (
            <div
              key={idx}
              className={`ap-slide ${idx === currentSlide ? "ap-slide-active" : ""}`}
              aria-hidden={idx !== currentSlide}
            >
              <img
                src={url}
                alt={`${title || "Wedding Memory"} ${idx + 1}`}
                loading={idx === 0 ? "eager" : "lazy"}
              />
              <div className="ap-slide-overlay">
                <span className="ap-slide-hint">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  Tap to expand
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Prev / Next Nav Chevrons */}
      


        {/* Dot Indicators */}
        {count > 1 && (
          <div className="ap-dots-bar" onClick={(e) => e.stopPropagation()}>
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`ap-dot ${idx === currentSlide ? "active" : ""}`}
                onClick={(e) => goToSlide(idx, e)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnail Strip ── */}
      {count > 1 && (
        <div className="ap-thumb-wrapper">
          <div className="ap-thumb-track">
            {images.map((url, idx) => (
              <button
                key={idx}
                type="button"
                ref={(el) => (thumbnailRefs.current[idx] = el)}
                className={`ap-thumb-item ${idx === currentSlide ? "active" : ""}`}
                onClick={(e) => goToSlide(idx, e)}
                aria-label={`Select photo ${idx + 1}`}
              >
                <img src={url} alt={`Thumbnail ${idx + 1}`} loading="lazy" />
                <span className="ap-thumb-idx">{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Fullscreen Lightbox Modal ── */}
      {isLightboxOpen && (
        <div
          className={`ap-lightbox theme-${theme}`}
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="ap-lightbox-box"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ap-lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            {count > 1 && (
              <>
                <button
                  type="button"
                  className="ap-lightbox-nav ap-lightbox-prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIdx = lightboxIdx > 0 ? lightboxIdx - 1 : count - 1;
                    setLightboxIdx(newIdx);
                    setCurrentSlide(newIdx);
                  }}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="ap-lightbox-nav ap-lightbox-next"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIdx = lightboxIdx < count - 1 ? lightboxIdx + 1 : 0;
                    setLightboxIdx(newIdx);
                    setCurrentSlide(newIdx);
                  }}
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            )}

            <div className="ap-lightbox-media">
              <img
                src={images[lightboxIdx]}
                alt={`Photo ${lightboxIdx + 1}`}
                className="ap-lightbox-img"
              />
            </div>

            <div className="ap-lightbox-footer">
              <span className="ap-lightbox-counter">
                Photo {lightboxIdx + 1} of {count}
              </span>
              <span className="ap-lightbox-hint">
                Use left/right arrows to browse • Esc to close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
