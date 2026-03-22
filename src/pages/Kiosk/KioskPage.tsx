import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { TicketKiosk } from "../../features/ticket/ui/TicketKiosk";
import { supabase } from "../../shared/api/supabaseClient";

interface Props {
  userAgenceId?: string | null;
}

export const KioskPage: React.FC<Props> = ({ userAgenceId }) => {
  const { slug } = useParams<{ slug: string }>();
  const [fetchedAgenceId, setFetchedAgenceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      const fetchAgenceBySlug = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from("agence")
            .select("id")
            .eq("slug", slug)
            .single();
          if (error) throw error;
          if (data) setFetchedAgenceId(data.id);
        } catch (err) {
          console.error("Error fetching agence by slug:", err);
          setError("Agence introuvable");
        } finally {
          setLoading(false);
        }
      };
      fetchAgenceBySlug();
    }
  }, [slug]);

  const activeAgenceId = slug ? fetchedAgenceId : userAgenceId;

  if (slug && loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.2rem",
          fontWeight: "bold",
        }}
      >
        Chargement de la borne...
      </div>
    );
  }

  if (slug && error) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--danger-color)",
          fontSize: "1.2rem",
          fontWeight: "bold",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <TicketKiosk
      key={activeAgenceId || "kiosk-main-key"}
      userAgenceId={activeAgenceId ?? null}
    />
  );
};
