import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../shared/hooks/useDynamicPageSize";
import { supabase } from "../../shared/api/supabaseClient";
import type { Guichet, UserRole } from "../../shared/types";
import "./GuichetPage.css"; // We'll create a basic css file or reuse styles

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

const GUICHET_OPTIONS = Array.from(
  { length: 20 },
  (_, i) => `Guichet ${i + 1}`,
);

export const GuichetPage: React.FC<Props> = ({
  userRole,
  currentUserAgenceId,
}) => {
  const [guichets, setGuichets] = useState<Guichet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Modal State
  const [selectedGuichet, setSelectedGuichet] = useState(GUICHET_OPTIONS[0]);
  const [appellation, setAppellation] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(tableContainerRef, GUICHET_OPTIONS.length);

  const fetchGuichets = useCallback(async () => {
    if (!currentUserAgenceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("guichet")
        .select("*")
        .eq("agence_id", currentUserAgenceId)
        .order("nom_guichet", { ascending: true });

      if (error) throw error;
      setGuichets(data as Guichet[]);
    } catch (err: any) {
      console.error(
        "Erreur lors de la récupération des guichets:",
        err.message,
      );
    } finally {
      setLoading(false);
    }
  }, [currentUserAgenceId]);

  useEffect(() => {
    fetchGuichets();
  }, [fetchGuichets]);

  const handleOpenModal = (
    guichetName?: string,
    currentAppellation?: string,
  ) => {
    setSelectedGuichet(guichetName || GUICHET_OPTIONS[0]);
    setAppellation(currentAppellation || "");
    setMessage("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!currentUserAgenceId) return;
    setLoading(true);
    setMessage("");

    try {
      if (appellation.trim() === "") {
        const { error } = await supabase
          .from("guichet")
          .upsert(
            {
              nom_guichet: selectedGuichet,
              appellation: null,
              agence_id: currentUserAgenceId,
            },
            { onConflict: "nom_guichet, agence_id" },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("guichet")
          .upsert(
            {
              nom_guichet: selectedGuichet,
              appellation: appellation.trim(),
              agence_id: currentUserAgenceId,
            },
            { onConflict: "nom_guichet, agence_id" },
          );
        if (error) throw error;
      }

      setIsSuccess(true);
      setMessage("Appellation enregistrée avec succès");
      await fetchGuichets();

      setTimeout(() => {
        setShowModal(false);
        setMessage("");
      }, 1500);
    } catch (err: any) {
      setIsSuccess(false);
      setMessage(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (nomGuichet: string) => {
    if (!currentUserAgenceId) return;
    if (
      !confirm(
        `Voulez-vous vraiment réinitialiser l'appellation du ${nomGuichet} ?`,
      )
    )
      return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("guichet")
        .delete()
        .eq("nom_guichet", nomGuichet)
        .eq("agence_id", currentUserAgenceId);

      if (error) throw error;
      await fetchGuichets();
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "admin" && userRole !== "super_admin") {
    return <div className="auth-permission-denied">Accès non autorisé</div>;
  }

  // Fusionner la configuration DB avec les 20 options par défaut pour tout afficher
  const allGuichetsDisplay = GUICHET_OPTIONS.map((opt) => {
    const dbGuichet = guichets.find((g) => g.nom_guichet === opt);
    return {
      nom_guichet: opt,
      appellation: dbGuichet?.appellation || null,
      isConfigured: !!dbGuichet,
    };
  });

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des Guichets</h1>
          <p>
            Configurez les appellations personnalisées de vos guichets (ex:
            Caisse Principale)
          </p>
        </div>
        <button
          className="primary-gradient-btn"
          onClick={() => handleOpenModal()}
        >
          + Configurer une Appellation
        </button>
      </header>

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
              <div className="auth-card-icon">🏷️</div>
              <h2 className="auth-card-title">Appellation du Guichet</h2>
              <p className="auth-card-subtitle">
                Définissez le nom public du guichet
              </p>
            </div>

            <div className="auth-form">
              <div className="auth-input-group">
                <label className="auth-input-label">
                  Identifiant Technique
                </label>
                <select
                  className="auth-select"
                  value={selectedGuichet}
                  onChange={(e) => setSelectedGuichet(e.target.value)}
                  disabled={loading}
                >
                  {GUICHET_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">
                  Appellation Publique (Optionnel)
                </label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="Ex: Caisse 1, Bureau des entrées..."
                  value={appellation}
                  onChange={(e) => setAppellation(e.target.value)}
                  disabled={loading}
                />
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

      <div className="content-card" ref={tableContainerRef}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Appellation Publique</th>
              <th>Statut</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allGuichetsDisplay
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage,
              )
              .map((g) => (
                <tr key={g.nom_guichet}>
                  <td className="font-bold">{g.nom_guichet}</td>
                  <td>
                    {g.appellation ? (
                      <span
                        style={{ color: "var(--primary)", fontWeight: 600 }}
                      >
                        {g.appellation}
                      </span>
                    ) : (
                      <span className="text-secondary">
                        Non défini (utilisera l'identifiant)
                      </span>
                    )}
                  </td>
                  <td>
                    {g.isConfigured && g.appellation ? (
                      <span className="status-badge user">Personnalisé</span>
                    ) : (
                      <span className="status-badge priority">Par défaut</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="icon-btn edit"
                      onClick={() =>
                        handleOpenModal(g.nom_guichet, g.appellation || "")
                      }
                      title="Modifier l'appellation"
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
                    {g.isConfigured && (
                      <button
                        className="icon-btn delete"
                        onClick={() => handleDelete(g.nom_guichet)}
                        title="Réinitialiser"
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
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {needsPagination && (
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ←
            </button>
            {Array.from(
              { length: Math.ceil(allGuichetsDisplay.length / itemsPerPage) },
              (_, i) => i + 1,
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
              disabled={
                currentPage ===
                Math.ceil(allGuichetsDisplay.length / itemsPerPage)
              }
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
            <span className="pagination-info">
              {allGuichetsDisplay.length} guichet
              {allGuichetsDisplay.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
