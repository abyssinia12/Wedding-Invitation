import React, { useState } from "react";
import InvitationFirst from "./InvitationFirst";
import InvitationSecond from "./InvitationSecond";
import InvitationThird from "./InvitationThird";
import StyleSelectorBar from "../../components/StyleSelectorBar";

export default function InvitationStylesPreview() {
  const [currentStyle, setCurrentStyle] = useState("first");

  // Sample mock data for previewing without needing an active token or DB record
  const mockWedding = {
    bride_name: "Sophia Martinez",
    groom_name: "Alexander Hayes",
    wedding_date: "2026-10-24",
    wedding_time: "16:00:00",
    location_name: "The Grand Belmond Villa & Gardens",
    location_address: "742 Evergreen Terrace, Beverly Hills, CA",
    latitude: 34.0736,
    longitude: -118.4004,
    image_url:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
    extra_images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80"
    ],
    message:
      "Two souls with but a single thought, two hearts that beat as one. We cordially request the honor of your presence.",
  };

  const mockGuest = {
    full_name: "Jonathan & Elizabeth Reed",
    guest_count: 2,
  };

  const mockInvite = {
    token: "demo_preview_token",
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Active Invitation Style */}
      {currentStyle === "first" && (
        <InvitationFirst
          invite={mockInvite}
          wedding={mockWedding}
          guest={mockGuest}
        />
      )}
      {currentStyle === "second" && (
        <InvitationSecond
          invite={mockInvite}
          wedding={mockWedding}
          guest={mockGuest}
        />
      )}
      {currentStyle === "thered" && (
        <InvitationThird
          invite={mockInvite}
          wedding={mockWedding}
          guest={mockGuest}
        />
      )}

      {/* Selector bar */}
      <StyleSelectorBar
        currentStyle={currentStyle}
        onSelectStyle={setCurrentStyle}
      />
    </div>
  );
}
