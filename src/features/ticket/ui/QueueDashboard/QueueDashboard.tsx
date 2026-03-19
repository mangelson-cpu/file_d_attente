import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import "./QueueDashboard.css";
import { supabase } from "../../../../shared/api/supabaseClient";
import { sortByPriority } from "../../../../shared/utils/priorityUtils";



interface DashboardTicket {
  id: string;
  numero_ticket: string;
  status: string;
  nom_guichet: string | null;
  agence_id: string;
  niveau: string;
  date_debut: string | null;
  date_fin: string | null;
  created_at: string;
}

interface QueueDashboardProps {
  userAgenceId: string | null;
}
// ── Voix Synthétique ──────────────────────────────────────────────────────────
// Chrome bloque speechSynthesis tant qu'il n'y a pas eu d'interaction utilisateur.
// On "déverrouille" la voix au premier clic sur la page.
let speechUnlocked = false;

function unlockSpeech(): void {
  if (speechUnlocked || !window.speechSynthesis) return;
  // Prononcer un texte vide pour débloquer le moteur vocal
  const silentUtterance = new SpeechSynthesisUtterance("");
  silentUtterance.volume = 0;
  window.speechSynthesis.speak(silentUtterance);
  speechUnlocked = true;
}

// Écouter le premier clic sur la page pour débloquer
if (typeof document !== "undefined") {
  document.addEventListener("click", unlockSpeech, { once: true });
  document.addEventListener("touchstart", unlockSpeech, { once: true });
}

function announceTicket(numeroTicket: string, nomGuichet: string | null, appellationMap: Record<string, string> = {}): void {
  if (!window.speechSynthesis) return;

  const appellation = nomGuichet ? appellationMap[nomGuichet] : null;
  const guichetMatch = nomGuichet?.match(/(\d+)/);
  const guichetNum = guichetMatch ? parseInt(guichetMatch[1], 10) : null;
  const guichetText = appellation ? appellation : (guichetNum !== null ? `Guichet ${guichetNum}` : "guichet");

  // Retire les zéros non significatifs du numéro (ex: "D002" -> "D 2") pour que la voix dise "D deux"
  const ticketMatches = numeroTicket.match(/([A-Z]*)0*(\d+)/i);
  const prononceTicket = ticketMatches ? `${ticketMatches[1]} ${ticketMatches[2]}`.trim() : numeroTicket;

  // Pause longue (virgule + points de suspension) entre le numéro et le guichet
  const announcementText = `${prononceTicket}, ... ${guichetText}`;

  const speak = () => {
    // Annuler toute annonce précédente pour éviter le bug de freeze de Chrome
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(announcementText);
    utterance.lang = "fr-FR";
    utterance.rate = 0.35; // Très lent pour une annonce claire et audible
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(
      (v) => v.name.includes("Google") && (v.lang === "fr-FR" || v.lang.includes("fr"))
    );
    const fallbackVoice = voices.find(
      (v) => v.lang === "fr-FR" || v.lang.includes("fr")
    );

    if (googleVoice) utterance.voice = googleVoice;
    else if (fallbackVoice) utterance.voice = fallbackVoice;

    // Petit délai pour laisser Chrome traiter le cancel()
    setTimeout(() => {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  // Si les voix ne sont pas encore chargées, attendre le chargement
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      speak();
      window.speechSynthesis.onvoiceschanged = null;
    };
  } else {
    speak();
  }
}

// ── YouTubePlayer : lecture vidéo YouTube via iframe ──────────
const YouTubePlayer: React.FC = memo(() => {
  const youtubeUrl = import.meta.env.VITE_YOUTUBE_URL as string | undefined;

  if (!youtubeUrl) {
    return (
      <div className="video-panel video-panel--empty">
        <div className="video-panel-idle">
          <span className="video-panel-idle-icon">📺</span>
        </div>
      </div>
    );
  }

  return (
    <div className="video-panel">
      <iframe
        className="video-player"
        src={youtubeUrl}
        title="Vidéo publicitaire"
        allow="autoplay; encrypted-media"
        allowFullScreen
        style={{ border: "none" }}
      />
    </div>
  );
});


// ── Composant Principal ────────────────────────────────────────────────────────
export const QueueDashboard: React.FC<QueueDashboardProps> = ({
  userAgenceId,
}) => {
  const agenceId = userAgenceId;

  const [tickets, setTickets] = useState<DashboardTicket[]>([]);
  const [popupTicket, setPopupTicket] = useState<DashboardTicket | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [guichetAppellations, setGuichetAppellations] = useState<Record<string, string>>({});
  const appellationsRef = useRef<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedTicketId = useRef<string | null>(null);

  // Pré-charger les voix au montage du composant
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Écouteur pour mettre à jour l'état si l'utilisateur quitte le plein écran avec Echap
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
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

  // Fetch initial + Realtime
  useEffect(() => {
    if (!agenceId) return;

    const fetchTodayTickets = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("ticket")
        .select(
          "id, numero_ticket, status, nom_guichet, agence_id, niveau, date_debut, date_fin, created_at"
        )
        .eq("agence_id", agenceId)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: true });

      if (data && !error) setTickets(data as DashboardTicket[]);
    };

    const fetchAppellations = async () => {
      const { data } = await supabase
        .from("guichet")
        .select("nom_guichet, appellation")
        .eq("agence_id", agenceId);

      if (data) {
        const mapping: Record<string, string> = {};
        data.forEach(item => {
          if (item.appellation) mapping[item.nom_guichet] = item.appellation;
        });
        setGuichetAppellations(mapping);
        appellationsRef.current = mapping; // Stocké dans le ref pour y accéder dans les subs
      }
    };

    fetchAppellations();
    fetchTodayTickets();

    const channel = supabase
      .channel("public_dashboard_tickets")
      .on("broadcast", { event: "rappel_ticket" }, (payload) => {
        const { ticket } = payload.payload;
        if (ticket.agence_id && ticket.agence_id !== agenceId) return;
        setPopupTicket(ticket);
        setTimeout(() => setPopupTicket(null), 5000);
        setTimeout(() => announceTicket(ticket.numero_ticket, ticket.nom_guichet, appellationsRef.current), 300);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket" },
        (payload) => {
          const newTicket = payload.new as DashboardTicket;
          if (newTicket.agence_id && newTicket.agence_id !== agenceId) return;

          if (payload.eventType === "INSERT") {
            setTickets((prev) => [...prev, newTicket]);
          } else if (payload.eventType === "UPDATE") {
            setTickets((prev) => {
              const ticketIndex = prev.findIndex((t) => t.id === newTicket.id);
              if (ticketIndex === -1) return prev;

              const mergedTicket = { ...prev[ticketIndex], ...newTicket };

              if (newTicket.status === "called") {
                // Escape the current state update to trigger another one safely
                setTimeout(() => {
                  setPopupTicket(mergedTicket);
                  setTimeout(() => setPopupTicket(null), 5000);
                  if (lastAnnouncedTicketId.current !== mergedTicket.id) {
                    lastAnnouncedTicketId.current = mergedTicket.id;
                    setTimeout(() => announceTicket(mergedTicket.numero_ticket, mergedTicket.nom_guichet, appellationsRef.current), 300);
                  }
                }, 0);
              }

              const newTickets = [...prev];
              newTickets[ticketIndex] = mergedTicket;
              return newTickets;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agenceId]);

  // Filtres tickets memoïzés pour éviter les recalculs inutiles
  const waitingTickets = useMemo(() => sortByPriority(tickets.filter((t) => t.status === "waiting")), [tickets]);
  const calledTickets = useMemo(() => tickets.filter((t) => t.status === "called"), [tickets]);
  const doneTickets = useMemo(() => {
    return tickets
      .filter((t) => t.status === "done")
      .sort(
        (a, b) =>
          new Date(b.date_fin || b.created_at).getTime() -
          new Date(a.date_fin || a.created_at).getTime()
      )
      .slice(0, 10);
  }, [tickets]);

  const getGuichetNumber = (nomGuichet: string | null): string => {
    if (!nomGuichet) return "—";
    const match = nomGuichet.match(/(\d+)/);
    if (!match) return nomGuichet;
    return match[1].padStart(2, "0");
  };

  // Auto-scroll file d'attente
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || waitingTickets.length <= 5) return;
    let animationId: number;
    let scrollPos = 0;
    const speed = 0.5;
    const animate = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollHeight - el.clientHeight) scrollPos = 0;
      el.scrollTop = scrollPos;
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [waitingTickets.length]);

  if (!agenceId) {
    return (
      <div className="dashboard-container" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Agence non configurée</h2>
          <p style={{ fontSize: "1.2rem", opacity: 0.8 }}>
            Veuillez utiliser un lien spécifiant une agence (ex: /nom-agence/screen).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-bg-decorator shape-1"></div>
      <div className="dashboard-bg-decorator shape-2"></div>
      <div className="dashboard-bg-decorator shape-3"></div>

      {/* Bouton Plein Écran Discret */}
      <button
        className="fullscreen-btn"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Quitter le plein écran" : "Passer en plein écran"}
      >
        {isFullscreen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        )}
      </button>

      <main className="dashboard-main">
        {/* ── Zone Principale Gauche : Vidéo à 80% + Annonce en Overlay ── */}
        <div className="dashboard-left-zone">
          <YouTubePlayer />

          {/* L'annonce vient en superposition pour ne pas pousser la file d'attente */}
          {popupTicket && (
            <div className="announcement-overlay">
              <div className="announcement-card">
                <span className="announcement-label">NUMÉRO APPELÉ</span>
                <h2 className="announcement-number">{popupTicket.numero_ticket}</h2>
                <p className="announcement-subtext">est attendu au</p>
                <div className="counter-box" style={{ width: 'auto', padding: '0 2rem' }}>
                  <span className="counter-number" style={{ fontSize: '3rem' }}>
                    {guichetAppellations[popupTicket.nom_guichet || ""] || popupTicket.nom_guichet || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Zone Droite (Positionnement original) : File d'attente ── */}
        <aside className="queue-sidebar">
          <div className="queue-list-header">
            <span className="queue-title-text">FILE D'ATTENTE</span>
          </div>
          <div className="queue-header-labels">
            <span>TICKET</span>
            <span>GUICHET</span>
          </div>
          <div className="queue-scroll-area" ref={scrollRef}>
            {/* 1. Tickets appelés en haut (highlighted) */}
            {calledTickets.map((item) => (
              <div key={item.id} className="queue-row active-row">
                <span className="queue-ticket">{item.numero_ticket}</span>
                <div className="queue-counter-circle">
                  {getGuichetNumber(item.nom_guichet)}
                </div>
              </div>
            ))}
            {/* 2. Tickets terminés ensuite */}
            {doneTickets.map((item) => (
              <div key={item.id} className="queue-row" style={{ opacity: 0.45 }}>
                <span className="queue-ticket">{item.numero_ticket}</span>
                <div className="queue-counter-circle" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                  {getGuichetNumber(item.nom_guichet)}
                </div>
              </div>
            ))}
            {calledTickets.length === 0 && doneTickets.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem", opacity: 0.6 }}>
                Aucun ticket pour le moment
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};
