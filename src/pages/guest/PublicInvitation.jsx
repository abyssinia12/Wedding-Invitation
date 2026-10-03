import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import InvitationFirst from "./InvitationFirst";
import InvitationSecond from "./InvitationSecond";
import InvitationThird from "./InvitationThird";
import "./PublicInvitation.css";

export default function PublicInvitation() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [currentStyle, setCurrentStyle] = useState("first");

  const styleParam = searchParams.get("style");

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

      // Ensure extra_images is parsed and available
      let loadedExtra = [];
      if (wedding.extra_images) {
        if (Array.isArray(wedding.extra_images)) loadedExtra = wedding.extra_images;
        else if (typeof wedding.extra_images === "string") {
          try {
            const parsed = JSON.parse(wedding.extra_images);
            if (Array.isArray(parsed)) loadedExtra = parsed;
          } catch (e) {}
        }
      }
      if (loadedExtra.length === 0 && wedding.id) {
        try {
          const localExtra = localStorage.getItem(`wedding_extra_images_${wedding.id}`);
          if (localExtra) {
            const parsed = JSON.parse(localExtra);
            if (Array.isArray(parsed)) loadedExtra = parsed;
          }
        } catch (e) {}
      }
      wedding.extra_images = loadedExtra;

      setInvitationData({ invite, wedding, guest });

      // Determine style set during wedding creation
      const rawTheme = wedding.theme || localStorage.getItem(`wedding_theme_${wedding.id}`);
      let resolvedStyle = "first";
      if (rawTheme === "second" || rawTheme === "garden" || rawTheme === "midnight") {
        resolvedStyle = "second";
      } else if (rawTheme === "thered" || rawTheme === "third") {
        resolvedStyle = "thered";
      } else if (rawTheme === "first" || rawTheme === "classic") {
        resolvedStyle = "first";
      }

      // Allow optional developer URL override (?style=second) if specified, otherwise strictly use wedding style
      if (styleParam && ["first", "second", "thered"].includes(styleParam)) {
        setCurrentStyle(styleParam);
      } else {
        setCurrentStyle(resolvedStyle);
      }
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

  return (
    <div style={{ position: "relative" }}>
      {/* Active Invitation Style Component (set at wedding creation time) */}
      {currentStyle === "first" && (
        <InvitationFirst invite={invite} wedding={wedding} guest={guest} />
      )}
      {currentStyle === "second" && (
        <InvitationSecond invite={invite} wedding={wedding} guest={guest} />
      )}
      {currentStyle === "thered" && (
        <InvitationThird invite={invite} wedding={wedding} guest={guest} />
      )}
    </div>
  );
}
