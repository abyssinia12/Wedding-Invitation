import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import InvitationFirst from "./InvitationFirst";
import InvitationSecond from "./InvitationSecond";
import InvitationThird from "./InvitationThird";
import "./PublicInvitation.css";

export default function PublicInvitation() {
  const { invitationId, token } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [currentStyle, setCurrentStyle] = useState("first");

  const styleParam = searchParams.get("style");
  const activeIdentifier = (invitationId || token || "").trim();

  useEffect(() => {
    let isMounted = true;

    async function loadInvitation() {
      if (!activeIdentifier) {
        setError("No invitation ID provided. Please check the link and try again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Query invitation by token
        let invite = null;
        const { data: byToken, error: tokenErr } = await supabase
          .from("invitations")
          .select("*")
          .eq("token", activeIdentifier)
          .eq("status", "active")
          .maybeSingle();

        if (tokenErr) {
          console.warn("Error querying invitation by token:", tokenErr);
        }

        if (byToken) {
          invite = byToken;
        } else {
          // 2. Fallback: check by id if activeIdentifier is a valid UUID
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeIdentifier);
          if (isUuid) {
            const { data: byId, error: idErr } = await supabase
              .from("invitations")
              .select("*")
              .eq("id", activeIdentifier)
              .eq("status", "active")
              .maybeSingle();

            if (idErr) {
              console.warn("Error querying invitation by UUID id:", idErr);
            }
            invite = byId;
          }
        }

        if (!invite) {
          if (isMounted) {
            setError("Invalid or expired invitation. Please verify your link.");
          }
          return;
        }

        // 3. Fetch wedding details
        const { data: wedding, error: weddingErr } = await supabase
          .from("weddings")
          .select("*")
          .eq("id", invite.wedding_id)
          .maybeSingle();

        if (weddingErr || !wedding) {
          console.error("Wedding query error:", weddingErr);
          if (isMounted) {
            setError("Wedding details could not be found.");
          }
          return;
        }

        // 4. Fetch guest details
        const { data: guest, error: guestErr } = await supabase
          .from("guests")
          .select("*")
          .eq("id", invite.guest_id)
          .maybeSingle();

        if (guestErr || !guest) {
          console.error("Guest query error:", guestErr);
          if (isMounted) {
            setError("Guest details could not be found.");
          }
          return;
        }

        // Ensure extra_images is parsed and available
        let loadedExtra = [];
        if (wedding.extra_images) {
          if (Array.isArray(wedding.extra_images)) {
            loadedExtra = wedding.extra_images;
          } else if (typeof wedding.extra_images === "string") {
            try {
              const parsed = JSON.parse(wedding.extra_images);
              if (Array.isArray(parsed)) loadedExtra = parsed;
            } catch {
              // Ignore JSON parse error
            }
          }
        }
        if (loadedExtra.length === 0 && wedding.id) {
          try {
            const localExtra = localStorage.getItem(`wedding_extra_images_${wedding.id}`);
            if (localExtra) {
              const parsed = JSON.parse(localExtra);
              if (Array.isArray(parsed)) loadedExtra = parsed;
            }
          } catch {
            // Ignore localStorage parse error
          }
        }
        wedding.extra_images = loadedExtra;

        if (isMounted) {
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
        }
      } catch (err) {
        console.error("Fetch public invitation error:", err);
        if (isMounted) {
          setError("An unexpected error occurred while loading your invitation.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInvitation();

    return () => {
      isMounted = false;
    };
  }, [activeIdentifier, styleParam]);

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
        <span style={{ maxWidth: "480px", textAlign: "center", padding: "0 1.5rem", lineHeight: "1.6" }}>
          {error || "Unable to display invitation."}
        </span>
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
