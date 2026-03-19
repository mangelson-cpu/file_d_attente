import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";
import { supabase } from "../../../shared/api/supabaseClient";
import type {
  Service,
  Guichet,
  GuichetService,
  UserRole,
  // User,
} from "../../../shared/types";
import "./GuichetAssignment.css";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}


export const GuichetAssignment: React.FC<Props> = ({
  userRole,
  currentUserAgenceId,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<GuichetService[]>([]);
  const [guichets, setGuichets] = useState<Guichet[]>([]);
  // const [agents, setAgents] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedGuichet, setSelectedGuichet] = useState("");

  // État local pour le formulaire (checklist non encore enregistrée)
  const [localSelectedServices, setLocalSelectedServices] = useState<string[]>(
    [],
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(tableContainerRef, guichets.length);

  const fetchData = useCallback(
    async (ignore: boolean = false) => {
      console.log(
        "GuichetAssignment: fetchData called with agencyId:",
        currentUserAgenceId,
      );
      setFetchError("");
      if (!currentUserAgenceId) {
        console.warn(
          "GuichetAssignment: No agencyId provided, skipping fetch.",
        );
        return;
      }

      try {
        console.log("GuichetAssignment: Appel de la table 'service'");
        const { data: servicesData, error: servicesError } = await supabase
          .from("service")
          .select("*")
          .order("nom_service");

        console.log(
          "GuichetAssignment: Réponse 'service'",
          servicesData ? `${servicesData.length} reçus` : "Non défini",
        );
        if (servicesError) throw servicesError;

        console.log("GuichetAssignment: Appel de la table 'guichet_service'");
        const { data: assignmentsData, error: assignmentsError } =
          await supabase
            .from("guichet_service")
            .select(
              `
                  *,
                  service:service_id(id, nom_service),
                  agence:agence_id(id, nom)
                `,
            )
            .eq("agence_id", currentUserAgenceId);

        console.log(
          "GuichetAssignment: Réponse 'guichet_service'",
          assignmentsData ? `${assignmentsData.length} reçus` : "Non défini",
        );
        if (assignmentsError) throw assignmentsError;

        console.log("GuichetAssignment: Appel de la table 'guichet' pour appellations");
        const { data: guichetData, error: guichetError } = await supabase
          .from("guichet")
          .select("*")
          .eq("agence_id", currentUserAgenceId);

        if (guichetError) {
          console.warn("Erreur fetch guichet, peut-être table inexistante?", guichetError);
        }

        if (ignore) {
          console.log(
            "GuichetAssignment: Requête ignorée car le composant a été démonté.",
          );
          return;
        }

        if (servicesData) setServices(servicesData);
        if (assignmentsData) setAssignments(assignmentsData as any);
        if (guichetData) {
          const typedGuichets = guichetData as Guichet[];
          setGuichets(typedGuichets);
          if (typedGuichets.length > 0 && !selectedGuichet) {
            setSelectedGuichet(typedGuichets[0].nom_guichet);
          }
        }
      } catch (err: any) {
        if (ignore) return;
        console.error("Erreur fetchData:", err);
        setFetchError(err.message || "Impossible de charger les données");
        setServices([]);
        setAssignments([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    },
    [currentUserAgenceId],
  );

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      await fetchData(ignore);
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [fetchData]);

  // Initialiser les services sélectionnés localement quand on change de guichet ou ouvre la modal
  useEffect(() => {
    if (showModal) {
      const alreadyAssigned = assignments
        .filter((a) => a.nom_guichet === selectedGuichet)
        .map((a) => a.service_id);

      setLocalSelectedServices(alreadyAssigned);
    }
  }, [selectedGuichet, showModal, assignments, guichets]);

  const handleToggleLocalService = (serviceId: string) => {
    setLocalSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleSave = async () => {
    if (!currentUserAgenceId) return;

    setLoading(true);
    setMessage("");

    try {
      // 1. Supprimer toutes les affectations existantes de services pour ce guichet
      const { error: deleteError } = await supabase
        .from("guichet_service")
        .delete()
        .eq("nom_guichet", selectedGuichet)
        .eq("agence_id", currentUserAgenceId);

      if (deleteError) throw deleteError;

      // 3. Insérer les nouvelles affectations si il y en a
      if (localSelectedServices.length > 0) {
        const newAssignments = localSelectedServices.map((serviceId) => ({
          nom_guichet: selectedGuichet,
          service_id: serviceId,
          agence_id: currentUserAgenceId,
        }));

        const { error: insertError } = await supabase
          .from("guichet_service")
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      await fetchData();
      setIsSuccess(true);
      setMessage("Configuration enregistrée avec succès");

      setTimeout(() => {
        setShowModal(false);
        setMessage("");
      }, 1500);
    } catch (err: any) {
      setMessage(err.message || "Erreur lors de l'enregistrement");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  // Grouper les affectations par guichet pour l'affichage du tableau
  // On utilise uniquement les guichets configurés dans la table 'guichet'
  const groupedAssignments = guichets.map((gInfo) => {
    const opt = gInfo.nom_guichet;
    const relevantAssignments = assignments.filter((a) => a.nom_guichet === opt);
    const agenceName = relevantAssignments[0]?.agence?.nom || "Votre Agence";

    return {
      nom_guichet: opt,
      appellation: gInfo?.appellation || "",
      agence_nom: agenceName,
      services: relevantAssignments
        .map((a) => a.service?.nom_service)
        .filter(Boolean) as string[],
    };
  });

  const handleDeleteAllForGuichet = async (nomGuichet: string) => {
    if (!currentUserAgenceId) return;
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer toutes les affectations pour le ${nomGuichet} ?`,
      )
    )
      return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("guichet_service")
        .delete()
        .eq("nom_guichet", nomGuichet)
        .eq("agence_id", currentUserAgenceId);

      if (error) throw error;
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "admin") {
    return (
      <div className="auth-permission-denied">
        Accès réservé aux administrateurs d'agence.
      </div>
    );
  }

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Affectation des Guichets</h1>
          <p>Configurez les services gérés par chaque guichet</p>
        </div>
        <button
          className="primary-gradient-btn"
          onClick={() => {
            if (guichets.length > 0) {
              setSelectedGuichet(guichets[0].nom_guichet);
              setShowModal(true);
            } else {
              alert("Veuillez d'abord configurer des guichets dans la page 'Gestion des Guichets'.");
            }
          }}
        >
          + Configurer un guichet
        </button>
      </header>

      {/* Modal Overlay */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setShowModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon">🛠️</div>
              <h2 className="auth-card-title">Affectation de Services</h2>
              <p className="auth-card-subtitle">
                Choisissez un guichet et cochez ses services
              </p>
            </div>

            <div className="auth-form">
              <div className="auth-input-group">
                <label className="auth-input-label">Guichet</label>
                <select
                  className="auth-select guichet-select"
                  value={selectedGuichet}
                  onChange={(e) => setSelectedGuichet(e.target.value)}
                  style={{ width: "100%", maxWidth: "none" }}
                  disabled={loading}
                >
                  {guichets.map((g) => (
                    <option key={g.id} value={g.nom_guichet}>
                      {g.nom_guichet} {g.appellation ? `(${g.appellation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="services-checklist-container">
                <label className="auth-input-label">
                  Checklist des Services
                </label>
                <div className="checklist-grid-modal">
                  {services.map((service) => (
                    <label
                      key={service.id}
                      className={`checklist-item-compact ${localSelectedServices.includes(service.id) ? "checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={localSelectedServices.includes(service.id)}
                        onChange={() => handleToggleLocalService(service.id)}
                        disabled={loading}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="service-name">
                        {service.nom_service}
                      </span>
                    </label>
                  ))}
                </div>
                {services.length === 0 && (
                  <div className="empty-state-small">
                    Aucun service défini par le Super Admin.
                  </div>
                )}
              </div>

              {message && (
                <div
                  className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"}`}
                  style={{ marginTop: "1rem" }}
                >
                  {message}
                </div>
              )}

              <div
                className="modal-actions"
                style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}
              >
                <button
                  className="auth-button"
                  style={{ flex: 1 }}
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  className="auth-button secondary"
                  style={{ flex: 1, background: "#f1f5f9", color: "#64748b" }}
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Table */}
      <div className="content-card" ref={tableContainerRef}>
        {fetchError && (
          <div
            className="auth-message auth-message--error"
            style={{
              marginBottom: "1rem",
              textAlign: "left",
              fontWeight: "bold",
            }}
          >
            Erreur de chargement ({new Date().toLocaleTimeString()}) :{" "}
            {fetchError}
          </div>
        )}
        <table className="premium-table">
          <thead>
            <tr>
              <th>Guichet / Caisse</th>
              <th>Agence</th>
              <th>Services Assignés</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedAssignments.length > 0 &&
              groupedAssignments
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((group) => (
                <tr key={group.nom_guichet}>
                  <td className="font-bold">
                    {group.nom_guichet} {group.appellation ? `(${group.appellation})` : ""}
                  </td>
                  <td className="text-secondary">{group.agence_nom}</td>
                  <td>
                    <div className="service-tags-container">
                      {group.services.map((s) => (
                        <span key={s} className="status-badge user">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="icon-btn edit"
                      onClick={() => {
                        setSelectedGuichet(group.nom_guichet);
                        setShowModal(true);
                      }}
                      title="Modifier les services"
                      disabled={loading}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() =>
                        handleDeleteAllForGuichet(group.nom_guichet)
                      }
                      title="Supprimer toutes les affectations"
                      disabled={loading}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {needsPagination && (
          <div className="pagination-controls">
            <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
            {Array.from({ length: Math.ceil(groupedAssignments.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
              <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
            <button className="pagination-btn" disabled={currentPage === Math.ceil(groupedAssignments.length / itemsPerPage)} onClick={() => setCurrentPage(p => p + 1)}>→</button>
            <span className="pagination-info">{groupedAssignments.length} guichet{groupedAssignments.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
};
