import React, { useEffect, useState, useRef, useCallback } from "react";
import type { UserRole, Ticket } from "../../shared/types";
import { AgentTicketManager } from "../../features/ticket/ui/AgentTicketManager/AgentTicketManager";
import { supabase } from "../../shared/api/supabaseClient";
import { useDynamicPageSize } from "../../shared/hooks/useDynamicPageSize";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

type ExtendedTicket = Ticket & {
  service?: { nom_service: string };
  sous_service?: { nom_sous_service: string };
  agence?: { nom: string };
  agent_nom?: string;
  evaluation_score?: number | null;
};

export const TicketsListPage: React.FC<Props> = ({ userRole, currentUserAgenceId }) => {
  const [tickets, setTickets] = useState<ExtendedTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    tickets.length
  );

  const fetchTicketsData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("ticket")
        .select(`
          *,
          service(nom_service),
          sous_service(nom_sous_service),
          agence(nom)
        `)
        .order("created_at", { ascending: false });

      if (userRole === "admin" && currentUserAgenceId) {
        query = query.eq("agence_id", currentUserAgenceId);
      }

      const { data: ticketsData, error: ticketsError } = await query;
      if (ticketsError) throw ticketsError;

      if (!ticketsData || ticketsData.length === 0) {
        setTickets([]);
        return;
      }

      const userIds = Array.from(new Set(ticketsData.map(t => t.user_id).filter(Boolean)));
      let usersMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("users")
          .select("id, nom_user")
          .in("id", userIds);
          
        if (usersData) {
          usersData.forEach(u => {
            usersMap[u.id] = u.nom_user;
          });
        }
      }

      const ticketNumeros = Array.from(new Set(ticketsData.map(t => t.numero_ticket).filter(Boolean)));
      let evalsMap: Record<string, number> = {};
      
      if (ticketNumeros.length > 0) {
        const { data: evalsData } = await supabase
          .from("evaluations")
          .select("ticket_numero, score")
          .in("ticket_numero", ticketNumeros);
          
        if (evalsData) {
          evalsData.forEach(e => {
            evalsMap[e.ticket_numero] = e.score;
          });
        }
      }

      const mergedTickets: ExtendedTicket[] = ticketsData.map(t => ({
        ...t,
        agent_nom: t.user_id ? usersMap[t.user_id] : undefined,
        evaluation_score: evalsMap[t.numero_ticket] ?? null
      }));

      setTickets(mergedTickets);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error fetching admin tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [userRole, currentUserAgenceId]);

  useEffect(() => {
    if (userRole === "admin" || userRole === "super_admin") {
      fetchTicketsData();
    }
  }, [fetchTicketsData, userRole]);

  if (userRole === "user") {
    return <AgentTicketManager />;
  }

  const getEmojiForScore = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "---";
    if (score === 1) return "😍 Très satisfait";
    if (score === 2) return "😐 Neutre";
    if (score === 3) return "😡 Insatisfait";
    return `${score}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case "waiting": return "priority-normal";
      case "ready": return "priority-normal"; 
      case "called": return "priority-vip";
      case "done": return "priority-normal"; 
      case "cancelled": return "priority-urgent"; 
      default: return "";
    }
  };

  const formatDuration = (start: Date, end: Date) => {
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs} s`;
    
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    
    if (mins < 60) {
      return secs > 0 ? `${mins} min ${secs} s` : `${mins} min`;
    }
    
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours < 24) {
      return remainingMins > 0 ? `${hours} h ${remainingMins} min` : `${hours} h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return remainingHours > 0 ? `${days} j ${remainingHours} h` : `${days} j`;
  };

  return (
    <div className="agences-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Liste des Tickets</h1>
          <p>Supervisez l'historique de tous les tickets</p>
        </div>
      </header>

      <div className="content-card" ref={tableContainerRef} style={{ overflowX: "auto", position: "relative" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>Chargement des données...</div>
        ) : (
          <>
            <table className="premium-table" style={{ minWidth: "1200px" }}>
              <thead>
                <tr>
                  <th>N° Ticket</th>
                  <th>Date & Heure</th>
                  <th>Service</th>
                  <th>Sous-service</th>
                  {userRole === "super_admin" && <th>Agence</th>}
                  <th>Guichet</th>
                  <th>Agent</th>
                  <th>Statut</th>
                  <th>Priorité</th>
                  <th>Attente</th>
                  <th>Traitement</th>
                  <th>Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length > 0 ? (
                  tickets
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    )
                    .map((t) => {
                      const createdAt = new Date(t.created_at);
                      const beginAt = t.date_debut ? new Date(t.date_debut) : null;
                      const endAt = t.date_fin ? new Date(t.date_fin) : null;
                      
                      const timeString = createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                      const dateString = createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
                      
                      let waitTime = "---";
                      if (beginAt) {
                        waitTime = formatDuration(createdAt, beginAt);
                      }
                      
                      let processTime = "---";
                      if (beginAt && endAt) {
                        processTime = formatDuration(beginAt, endAt);
                      }

                      return (
                        <tr key={t.id}>
                          <td className="font-bold">{t.numero_ticket}</td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span>{dateString}</span>
                              <span className="text-secondary text-sm">{timeString}</span>
                            </div>
                          </td>
                          <td>{t.service?.nom_service || "---"}</td>
                          <td className="text-secondary">{t.sous_service?.nom_sous_service || "---"}</td>
                          {userRole === "super_admin" && <td>{t.agence?.nom || "---"}</td>}
                          <td>{t.nom_guichet || "---"}</td>
                          <td>{t.agent_nom || "---"}</td>
                          <td>
                            <span className={`priority-tag ${getStatusBadgeClass(t.status)}`} style={{ textTransform: "capitalize" }}>
                              {t.status === 'done' ? 'Terminé' : t.status === 'cancelled' ? 'Ignoré' : t.status}
                            </span>
                          </td>
                          <td>
                            <span className={`priority-tag ${t.niveau === 'VIP' ? 'priority-vip' : t.niveau === 'Urgent' ? 'priority-urgent' : 'priority-normal'}`}>
                              {t.niveau}
                            </span>
                          </td>
                          <td className="text-secondary">{waitTime}</td>
                          <td className="text-secondary">{processTime}</td>
                          <td className="font-medium" style={{ whiteSpace: "nowrap" }}>
                            {getEmojiForScore(t.evaluation_score)}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={userRole === "super_admin" ? 12 : 11} style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                      Aucun ticket trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {needsPagination && (
              <div className="pagination-controls" style={{ marginTop: "1rem" }}>
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  ←
                </button>
                {Array.from(
                  { length: Math.ceil(tickets.length / itemsPerPage) },
                  (_, i) => i + 1
                ).map((page) => (
                  <button
                    key={page}
                    className={`pagination-btn ${currentPage === page ? "active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  disabled={currentPage === Math.ceil(tickets.length / itemsPerPage)}
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(tickets.length / itemsPerPage), p + 1))}
                >
                  →
                </button>
                <span className="pagination-info" style={{ marginLeft: "1rem" }}>
                  {tickets.length} ticket{tickets.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
