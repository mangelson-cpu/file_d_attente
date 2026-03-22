import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../../shared/api/supabaseClient";
import type { Service, Agence } from "../../../../shared/types";
import "./TicketKiosk.css";

interface Props {
  userAgenceId: string | null;
}

export const TicketKiosk: React.FC<Props> = ({ userAgenceId }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [services, setServices] = useState<Service[]>([]);
  const [agence, setAgence] = useState<Agence | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeAgenceId, setActiveAgenceId] = useState<string | null>(() => {
    return userAgenceId || null;
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (userAgenceId) {
      setActiveAgenceId(userAgenceId);
    }
  }, [userAgenceId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const fetchData = useCallback(async () => {
    console.log(
      "TicketKiosk: fetchData starting with activeAgenceId:",
      activeAgenceId,
    );
    if (!activeAgenceId) {
      setLoading(false);
      return;
    }

    try {
      const { data: agenceData, error: agenceError } = await supabase
        .from("agence")
        .select("*")
        .eq("id", activeAgenceId)
        .single();

      if (agenceError)
        console.error("TicketKiosk: Error fetching agence:", agenceError);
      if (agenceData) {
        console.log("TicketKiosk: Agence info retrieved:", agenceData.nom);
        setAgence(agenceData);
      }

      console.log(
        "TicketKiosk: Fetching guichet_service for agence:",
        activeAgenceId,
      );
      const { data: guichetServices, error } = await supabase
        .from("guichet_service")
        .select(
          `
                    service_id,
                    service:service_id(id, nom_service)
                `,
        )
        .eq("agence_id", activeAgenceId);

      if (error) {
        console.error("TicketKiosk: Supabase query error:", error);
        throw error;
      }

      console.log(
        "TicketKiosk: guichet_service count:",
        guichetServices?.length || 0,
      );

      const uniqueServicesMap = new Map();
      guichetServices?.forEach((item: unknown) => {
        const row = item as { service: Service | Service[] | null };
        const srv = Array.isArray(row.service) ? row.service[0] : row.service;
        if (srv && !uniqueServicesMap.has(srv.id)) {
          uniqueServicesMap.set(srv.id, srv);
        }
      });

      const uniqueServices = Array.from(uniqueServicesMap.values());
      console.log("TicketKiosk: Unique services count:", uniqueServices.length);
      setServices(uniqueServices);
    } catch (err) {
      console.error("Erreur TicketKiosk fetchData:", err);
    } finally {
      setLoading(false);
    }
  }, [activeAgenceId]);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("kiosk-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guichet_service",
          filter: `agence_id=eq.${activeAgenceId}`,
        },
        () => {
          console.log("TicketKiosk: Realtime update received, re-fetching...");
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, activeAgenceId]);

  const { slug } = useParams<{ slug: string }>();
  const basePath = slug ? `/${slug}/borne` : "/ticket";

  const handleSelectService = (service: Service) => {
    navigate(`${basePath}/priority`, {
      state: {
        serviceId: service.id,
        serviceName: service.nom_service,
        agenceId: activeAgenceId,
        agenceName: agence?.nom,
      },
    });
  };

  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes("dépôt") || name.includes("depot")) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 21h18" />
          <path d="M3 10h18" />
          <path d="M5 6l7-3 7 3" />
          <path d="M4 10v11" />
          <path d="M20 10v11" />
          <path d="M8 14v3" />
          <path d="M12 14v3" />
          <path d="M16 14v3" />
        </svg>
      );
    }
    if (name.includes("retrait")) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    }
    if (name.includes("compte") || name.includes("client")) {
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      );
    }

    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="kiosk-container kiosk-loading">
        <div className="loader-spinner"></div>
        <p>Chargement des services...</p>
      </div>
    );
  }

  if (!activeAgenceId) {
    return (
      <div
        className="kiosk-container kiosk-error"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Agence non configurée
          </h2>
          <p style={{ fontSize: "1.2rem", opacity: 0.8 }}>
            Cette borne n'est rattachée à aucune agence active. Veuillez
            utiliser un lien valide (ex: /nom-agence/borne).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-container">
      <div className="kiosk-bg-decorator shape-1"></div>
      <div className="kiosk-bg-decorator shape-2"></div>
      <div className="kiosk-bg-decorator shape-3"></div>

      <button
        className="kiosk-fullscreen-btn"
        onClick={toggleFullscreen}
        title={
          isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"
        }
      >
        {isFullscreen ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
      </button>

      <header className="kiosk-header">
        <div className="kiosk-logo-group">
          <div className="kiosk-logo-circle">
            <span className="kiosk-logo-letter">B</span>
          </div>
          <div className="kiosk-logo-text-col">
            <h1 className="kiosk-logo-title">Baobab Ticket</h1>
            <p className="kiosk-logo-subtitle">Agence {agence?.nom || "..."}</p>
          </div>
        </div>
        <div className="kiosk-time-display">
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </header>

      <main className="kiosk-main">
        <div className="kiosk-stepper">
          <div className="step-dot active"></div>
          <div className="step-line"></div>
          <div className="step-dot inactive"></div>
        </div>

        <h2 className="kiosk-page-title">Sélectionnez un service</h2>

        <div className="kiosk-cards-grid">
          {services.length > 0 ? (
            services.map((service) => (
              <button
                key={service.id}
                className="kiosk-card-button"
                onClick={() => handleSelectService(service)}
              >
                <div className="kiosk-card-icon-wrapper">
                  {getServiceIcon(service.nom_service)}
                </div>
                <span className="kiosk-card-label">{service.nom_service}</span>
              </button>
            ))
          ) : (
            <div className="kiosk-empty-state">
              <p>
                Aucun service n'est actuellement disponible pour cette agence.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
