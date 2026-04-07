import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../../../shared/api/supabaseClient";
import type { Priority, UserRole } from "../../../shared/types";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";

interface Props {
  userRole: UserRole;
}

export const PriorityManager: React.FC<Props> = ({ userRole }) => {
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null);

  const [nom, setNom] = useState("");
  const [valeur, setValeur] = useState<number>(3);
  const [couleur, setCouleur] = useState("#64748b");
  const [icone, setIcone] = useState("normal"); // Default icone name matching local assets

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    priorities.length,
  );

  const isSuperAdmin = userRole === "super_admin";

  const fetchPriorities = useCallback(async () => {
    setFetchError("");
    try {
      const { data, error } = await supabase
        .from("priority")
        .select("*")
        .order("valeur", { ascending: true });

      if (error) throw error;
      if (data) {
        setPriorities(data as Priority[]);
      }
    } catch (err) {
      const error = err as Error;
      console.error("Erreur lors de la récupération des priorités:", error);
      setFetchError(error.message || "Impossible de charger les priorités");
    }
  }, []);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const priorityData = {
        nom: nom.trim(),
        valeur,
        couleur,
        icone,
      };

      if (editingPriority) {
        const { error } = await supabase
          .from("priority")
          .update(priorityData)
          .eq("id", editingPriority.id);

        if (error) throw error;
        setMessage("Priorité modifiée avec succès");
      } else {
        const { error } = await supabase
          .from("priority")
          .insert(priorityData);

        if (error) throw error;
        setMessage("Priorité créée avec succès");
      }

      setIsSuccess(true);
      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage("");
      }, 1000);

      await fetchPriorities();
    } catch (err) {
      const error = err as Error;
      console.error("Erreur handleSubmit:", error);
      setMessage(error.message || "Erreur lors de l'opération");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette priorité ?")) return;

    try {
      const { error } = await supabase.from("priority").delete().eq("id", id);
      if (error) throw error;
      await fetchPriorities();
    } catch (err) {
      const error = err as Error;
      console.error("Erreur delete:", error);
      alert(error.message || "Erreur lors de la suppression");
    }
  };

  const openEditModal = (priority: Priority) => {
    setEditingPriority(priority);
    setNom(priority.nom);
    setValeur(priority.valeur);
    setCouleur(priority.couleur);
    setIcone(priority.icone || "normal");
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setNom("");
    setValeur(3);
    setCouleur("#64748b");
    setIcone("normal");
    setEditingPriority(null);
    setMessage("");
    setIsSuccess(false);
  };

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des priorités</h1>
          <p>Gérez le catalogue global des niveaux de priorité (Poids plus petit = Priorité haute)</p>
        </div>
        {isSuperAdmin && (
          <button className="primary-gradient-btn" onClick={openCreateModal}>
            + Créer une priorité
          </button>
        )}
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
              <div className="auth-card-icon">⚡</div>
              <h2 className="auth-card-title">
                {editingPriority ? "Modifier la priorité" : "Nouvelle Priorité"}
              </h2>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label className="auth-input-label">Nom de la priorité</label>
                <input
                  className="auth-input"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Urgent, Premium, Normal..."
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Valeur Numérique (Poids)</label>
                <input
                  className="auth-input"
                  type="number"
                  value={valeur}
                  onChange={(e) => setValeur(parseInt(e.target.value))}
                  placeholder="Ex: 1 (Urgent), 3 (Normal)..."
                  required
                />
                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Le chiffre le plus petit est appelé en premier.
                </small>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Couleur (Hexadécimal)</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    className="auth-input"
                    type="color"
                    value={couleur}
                    onChange={(e) => setCouleur(e.target.value)}
                    style={{ width: "60px", padding: "2px", height: "45px" }}
                  />
                  <input
                    className="auth-input"
                    type="text"
                    value={couleur}
                    onChange={(e) => setCouleur(e.target.value)}
                    placeholder="#FFFFFF"
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Icône (Borne)</label>
                <select 
                  className="auth-input" 
                  value={icone} 
                  onChange={(e) => setIcone(e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="vip">VIP (Gold)</option>
                </select>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading
                  ? editingPriority
                    ? "Modification..."
                    : "Création..."
                  : editingPriority
                    ? "Modifier"
                    : "Enregistrer la priorité"}
              </button>
              {message && (
                <div
                  className={`auth-message ${isSuccess ? "auth-message--success" : "auth-message--error"}`}
                  style={{ marginTop: "1rem" }}
                >
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="content-card" ref={tableContainerRef}>
        {fetchError && (
          <div className="auth-message auth-message--error" style={{ marginBottom: "1rem" }}>
            {fetchError}
          </div>
        )}
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Poids (Ordre)</th>
              <th>Couleur</th>
              <th>Icône</th>
              {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {priorities.length > 0 ? (
              priorities
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((priority) => (
                  <tr key={priority.id}>
                    <td className="font-bold">{priority.nom}</td>
                    <td>{priority.valeur}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div 
                          style={{ 
                            width: "20px", 
                            height: "20px", 
                            borderRadius: "50%", 
                            backgroundColor: priority.couleur,
                            border: "1px solid rgba(255,255,255,0.1)"
                          }} 
                        />
                        {priority.couleur}
                      </div>
                    </td>
                    <td>{priority.icone}</td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="icon-btn edit"
                          onClick={() => openEditModal(priority)}
                          title="Modifier"
                          disabled={loading}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn delete"
                          onClick={() => handleDelete(priority.id)}
                          title="Supprimer"
                          disabled={loading}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} style={{ textAlign: "center", padding: "2rem", fontStyle: "italic", color: "var(--text-secondary)" }}>
                  Aucune priorité configurée dans le catalogue global.
                </td>
              </tr>
            )}
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
              { length: Math.ceil(priorities.length / itemsPerPage) },
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
              disabled={currentPage === Math.ceil(priorities.length / itemsPerPage)}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
