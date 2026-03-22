import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./TicketGenerated.css";

const VENDOR_ID = 0x1fc9;

interface USBDevice {
  vendorId: number;
  open: () => Promise<void>;
  close: () => Promise<void>;
  configuration: unknown;
  selectConfiguration: (c: number) => Promise<void>;
  claimInterface: (i: number) => Promise<void>;
  releaseInterface: (i: number) => Promise<void>;
  transferOut: (ep: number, data: Uint8Array) => Promise<void>;
  opened: boolean;
}

interface NavigatorWithUSB extends Navigator {
  usb?: {
    getDevices: () => Promise<USBDevice[]>;
    requestDevice: (options: { filters: { vendorId: number }[] }) => Promise<USBDevice>;
    addEventListener: (type: string, listener: (e: { device: USBDevice }) => void) => void;
    removeEventListener: (type: string, listener: (e: { device: USBDevice }) => void) => void;
  };
}

async function printTicket(ticketData: {
  numero_ticket: string;
  service_name: string;
  priority: string;
  agence_name?: string;
  created_at?: string;
  people_waiting: number;
}): Promise<void> {
  let device: USBDevice | null = null;

  try {
    const nav = navigator as unknown as NavigatorWithUSB;
    if (!nav.usb) {
      console.warn("WebUSB non supporté sur ce navigateur");
      return;
    }

    const devices = await nav.usb.getDevices();
    device = devices.find((d: USBDevice) => d.vendorId === VENDOR_ID) || null;

    if (!device) {
      console.warn(
        "Imprimante non associée. Un administrateur doit cliquer sur 'Associer l'imprimante'.",
      );
      return;
    }

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    const encoder = new TextEncoder();
    let text = "\x1B\x40";

    text += "\x1B\x61\x01";
    text += "\x1B\x45\x01";
    text += "BAOBAB TICKET\n";
    text += "\x1B\x45\x00";
    text += "--------------------------------\n\n";

    text += "VOTRE NUMERO\n";
    text += "\x1D\x21\x22";
    text += "\x1B\x45\x01";
    text += `${ticketData.numero_ticket}\n`;
    text += "\x1B\x45\x00";
    text += "\x1D\x21\x00";
    text += "\n--------------------------------\n\n";

    text += "\x1B\x61\x00";
    text += `Service : ${ticketData.service_name || "N/A"}\n`;
    text += `Priorite: ${ticketData.priority || "Normal"}\n`;
    if (ticketData.agence_name) text += `Agence  : ${ticketData.agence_name}\n`;

    text += `Personnes avant vous : ${ticketData.people_waiting}\n\n`;

    text += "\x1B\x61\x01";
    const dateString = ticketData.created_at
      ? new Date(ticketData.created_at).toLocaleString("fr-FR")
      : new Date().toLocaleString("fr-FR");
    text += `Heure   : ${dateString}\n`;
    text += "Merci de patienter.\n";

    text += "\n\n\n\n";

    const cutCommand = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);

    const textData = encoder.encode(text);
    const fullData = new Uint8Array(textData.length + cutCommand.length);
    fullData.set(textData);
    fullData.set(cutCommand, textData.length);

    await device.transferOut(1, fullData);
    console.log("Ticket imprimé et coupé via WebUSB !");
  } catch (error) {
    console.warn("Erreur d'impression WebUSB :", error);
    throw error;
  } finally {
    if (device && device.opened) {
      try {
        await device.releaseInterface(0).catch(() => {});
        await device.close().catch(() => {});
        console.log("Appareil USB fermé proprement");
      } catch (closeError) {
        console.log("Erreur lors de la fermeture de l'appareil", closeError);
      }
    }
  }
}

import { supabase } from "../../../../shared/api/supabaseClient";
import { getPriorityWeight } from "../../../../shared/utils/priorityUtils";

export const TicketGenerated: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [peopleWaiting, setPeopleWaiting] = useState<number>(0);
  const [printStatus, setPrintStatus] = useState<string>("");
  const [hasPrinted, setHasPrinted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const currentTime = new Date();
  const navigate = useNavigate();
  const location = useLocation();

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
  const { slug } = useParams<{ slug: string }>();

  const basePath = slug ? `/${slug}/borne` : "/ticket";
  const { ticket, serviceName, priorityName, agenceName } =
    location.state || {};

  const attemptPrint = React.useCallback(
    async (waitingCount: number = peopleWaiting) => {
      if (!ticket || hasPrinted) return;

      try {
        const nav = navigator as unknown as NavigatorWithUSB;
        if (nav.usb) {
          const devices = await nav.usb.getDevices();
          const device = devices.find((d: USBDevice) => d.vendorId === VENDOR_ID);
          if (device) {
            setPrintStatus("Impression en cours...");
            await printTicket({
              numero_ticket: ticket.numero_ticket,
              service_name: serviceName || "N/A",
              priority: priorityName || ticket.niveau || "Normal",
              agence_name: agenceName,
              created_at: ticket.created_at,
              people_waiting: waitingCount,
            });
            setPrintStatus("Impression réussie !");
            setHasPrinted(true);
          } else {
            setPrintStatus("Imprimante non détectée");
          }
        } else {
          setPrintStatus("USB non supporté (vérifiez HTTPS/flags)");
        }
      } catch (err) {
        const e = err as Error;
        setPrintStatus(`Erreur d'impression: ${e.message || "Échec"}`);
        setHasPrinted(false);
      }
    },
    [ticket, serviceName, priorityName, agenceName, peopleWaiting, hasPrinted],
  );

  const handleManualPrint = async () => {
    if (!ticket) return;
    setPrintStatus("Recherche de l'imprimante...");

    try {
      const nav = navigator as unknown as NavigatorWithUSB;
      if (!nav.usb) {
        setPrintStatus("WebUSB non supporté");
        return;
      }

      let device;
      try {
        device = await nav.usb.requestDevice({
          filters: [{ vendorId: VENDOR_ID }],
        });
      } catch {
        const devices = await nav.usb.getDevices();
        device = devices.find((d: USBDevice) => d.vendorId === VENDOR_ID);
      }

      if (!device) {
        setPrintStatus("Imprimante non détectée");
        return;
      }

      await attemptPrint(peopleWaiting);
    } catch (err) {
      const error = err as Error;
      setPrintStatus(`Erreur: ${error.message || "USB"}`);
    }
  };

  useEffect(() => {
    const nav = navigator as unknown as NavigatorWithUSB;
    if (!nav.usb) return;

    const handleConnect = (event: { device: USBDevice }) => {
      if (event.device.vendorId === VENDOR_ID) {
        console.log("Imprimante connectée", event.device);
        setPrintStatus("Imprimante ré-détectée, tentative d'impression...");

        setTimeout(() => {
          if (!hasPrinted) {
            attemptPrint();
          }
        }, 1000);
      }
    };

    const handleDisconnect = (event: { device: USBDevice }) => {
      if (event.device.vendorId === VENDOR_ID) {
        console.log("Imprimante déconnectée");
        setPrintStatus("Imprimante déconnectée. Veuillez brancher le câble.");
      }
    };

    nav.usb.addEventListener("connect", handleConnect);
    nav.usb.addEventListener("disconnect", handleDisconnect);

    return () => {
      nav.usb?.removeEventListener("connect", handleConnect);
      nav.usb?.removeEventListener("disconnect", handleDisconnect);
    };
  }, [attemptPrint, hasPrinted]);

  useEffect(() => {
    console.log("USB disponible :", !!(navigator as unknown as NavigatorWithUSB).usb);
    if (!ticket || hasPrinted) return;

    const fetchAndPrint = async () => {
      let waitingCount = 0;

      const ticketPriority = getPriorityWeight(ticket.niveau || "Normal");

      const higherPriorityLevels: string[] = [];
      if (ticketPriority > 0) higherPriorityLevels.push("VIP", "vip");
      if (ticketPriority > 1) higherPriorityLevels.push("Urgent", "urgent");

      let higherCount = 0;
      if (higherPriorityLevels.length > 0) {
        const { count: hc, error: hErr } = await supabase
          .from("ticket")
          .select("id", { count: "exact" })
          .eq("service_id", ticket.service_id)
          .eq("status", "waiting")
          .in("niveau", higherPriorityLevels);

        if (!hErr && hc !== null) {
          higherCount = hc;
        }
      }

      const currentLevel = ticket.niveau || "Normal";
      const sameLevelVariants = [
        currentLevel,
        currentLevel.toLowerCase(),
        currentLevel.charAt(0).toUpperCase() +
          currentLevel.slice(1).toLowerCase(),
      ];
      const uniqueVariants = [...new Set(sameLevelVariants)];

      const { count: sameCount, error: sErr } = await supabase
        .from("ticket")
        .select("id", { count: "exact" })
        .eq("service_id", ticket.service_id)
        .eq("status", "waiting")
        .in("niveau", uniqueVariants)
        .lt("created_at", ticket.created_at);

      if (!sErr && sameCount !== null) {
        waitingCount = higherCount + sameCount;
      } else {
        waitingCount = higherCount;
      }

      try {
        const { data: activeGuichets } = await supabase
          .from("active_guichets")
          .select("nom_guichet")
          .eq("agence_id", ticket.agence_id);

        if (activeGuichets && activeGuichets.length > 0) {
          const activeNames = activeGuichets.map((g) => g.nom_guichet);
          const { data: servingGuichets } = await supabase
            .from("guichet_service")
            .select("nom_guichet")
            .eq("service_id", ticket.service_id)
            .eq("agence_id", ticket.agence_id)
            .in("nom_guichet", activeNames);

          const activeCount = servingGuichets?.length || 1;
          if (activeCount > 1) {
            waitingCount = Math.ceil(waitingCount / activeCount);
          }
        }
      } catch (guichetError) {
        console.warn(
          "Erreur lors du calcul des guichets actifs:",
          guichetError,
        );
      }

      setPeopleWaiting(waitingCount);

      await attemptPrint(waitingCount);
    };

    fetchAndPrint();
  }, [ticket, attemptPrint, hasPrinted]);

  useEffect(() => {
    if (timeLeft <= 0) {
      navigate(basePath);
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, navigate, basePath]);

  if (!ticket) {
    return (
      <div className="kiosk-container ticket-generated-page">
        <main className="kiosk-main">
          <h2 className="ticket-title">Aucun ticket trouvé</h2>
          <button className="home-button" onClick={() => navigate(basePath)}>
            {" "}
            Retour{" "}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="kiosk-container ticket-generated-page">
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
            <p className="kiosk-logo-subtitle">Ticket Confirmé</p>
          </div>
        </div>
        <div className="kiosk-time-display">
          {currentTime.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </header>

      <main className="kiosk-main">
        <div className="success-icon-wrapper">
          <div className="success-circle">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="check-icon"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <div className="ticket-header-text">
          <h2 className="ticket-title">Merci ! Ticket généré</h2>
          <p className="ticket-subtitle">
            Veuillez vous diriger vers la salle d'attente
          </p>
        </div>

        <div className="ticket-card-container">
          <div className="ticket-card">
            <div className="ticket-number-section">
              <span className="label-small">VOTRE NUMÉRO</span>
              <h3 className="ticket-big-number">{ticket.numero_ticket}</h3>
            </div>
            <div className="ticket-details-grid">
              <div className="detail-item">
                <span className="label-tiny">SERVICE</span>
                <span className="value-normal">{serviceName || "Banque"}</span>
              </div>
              <div className="detail-item">
                <span className="label-tiny">NIVEAU</span>
                <span className="priority-badge" data-priority={ticket.niveau}>
                  {priorityName || "Normal"}
                </span>
              </div>
              <div className="detail-item">
                <span className="label-tiny">HEURE</span>
                <span className="value-normal">
                  {new Date(ticket.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            <div className="ticket-footer-strip">
              <div className="dots-line"></div>
              <p className="footer-message">
                Heure :{" "}
                {new Date(ticket.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            alignItems: "center",
            marginTop: "1rem",
          }}
        >
          {printStatus && (
            <div
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "20px",
                background: printStatus.includes("Erreur")
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(16, 185, 129, 0.1)",
                color: printStatus.includes("Erreur") ? "#ef4444" : "#10b981",
                fontSize: "0.9rem",
                fontWeight: "500",
              }}
            >
              {printStatus}
            </div>
          )}

          <div
            style={{ display: "flex", gap: "1rem", justifyContent: "center" }}
          >
            <button
              className="confirm-button"
              onClick={handleManualPrint}
              style={{ minWidth: "200px" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: "20px", marginRight: "8px" }}
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Imprimer le ticket</span>
            </button>

            <button className="home-button" onClick={() => navigate(basePath)}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="back-arrow"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Terminer ({timeLeft}s)</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
