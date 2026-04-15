import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";
import { supabase } from "../../../shared/api/supabaseClient";
import { FiLock, FiBriefcase } from "react-icons/fi";
import type { Agence } from "../../../shared/types";

export const AgenceManager: React.FC = () => {
  const [agences, setAgences] = useState<Agence[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAgence, setEditingAgence] = useState<Agence | null>(null);

  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Kiosk Security Modal State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityAgence, setSecurityAgence] = useState<Agence | null>(null);
  const [kioskPassword, setKioskPassword] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityIsSuccess, setSecurityIsSuccess] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    agences.length,
  );

  const fetchAgences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("agence")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setAgences(data as Agence[]);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Erreur fetchAgences:", err);
    }
  }, []);

  useEffect(() => {
    fetchAgences();
  }, [fetchAgences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const slugContent = nom
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      const payload = {
        nom: nom.trim(),
        adresse: adresse.trim() || null,
        slug: slugContent,
      };

      if (editingAgence) {
        const { error } = await supabase
          .from("agence")
          .update(payload)
          .eq("id", editingAgence.id);

        if (error) throw error;
        setMessage("Agence modifiée avec succès");
      } else {
        const { error } = await supabase.from("agence").insert(payload);

        if (error) throw error;
        setMessage("Agence créée avec succès");
      }

      setIsSuccess(true);

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage("");
      }, 1000);

      await fetchAgences();
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette agence ?")) return;

    try {
      const { error } = await supabase.from("agence").delete().eq("id", id);
      if (error) throw error;
      await fetchAgences();
    } catch (err) {
      const error = err as Error;
      console.error("Erreur handleDelete:", error);
      alert(error.message || "Erreur lors de la suppression");
    }
  };

  const openEditModal = (agence: Agence) => {
    setEditingAgence(agence);
    setNom(agence.nom);
    setAdresse(agence.adresse || "");
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setNom("");
    setAdresse("");
    setEditingAgence(null);
    setMessage("");
    setIsSuccess(false);
  };

  const openSecurityModal = (agence: Agence) => {
    setSecurityAgence(agence);
    setKioskPassword("");
    setSecurityMessage("");
    setShowSecurityModal(true);
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityAgence) return;

    setSecurityLoading(true);
    setSecurityMessage("");

    try {
      const { error } = await supabase.rpc("update_kiosk_password", {
        p_password: kioskPassword,
        p_agence_id: securityAgence.id,
      });

      if (error) throw error;

      setSecurityMessage(
        kioskPassword
          ? "Mot de passe de la borne mis à jour !"
          : "Mot de passe supprimé (borne déverrouillée)."
      );
      setSecurityIsSuccess(true);
      setKioskPassword("");
      
      setTimeout(() => {
        setShowSecurityModal(false);
        setSecurityMessage("");
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setSecurityMessage(err.message || "Erreur lors de la mise à jour.");
      setSecurityIsSuccess(false);
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="agences-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des agences</h1>
          <p>Gérez les agences de votre organisation</p>
        </div>
        <button className="primary-gradient-btn" onClick={openCreateModal}>
          + Créer une agence
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
              <div className="auth-card-icon"><FiBriefcase style={{ color: 'var(--primary-color)' }} /></div>
              <h2 className="auth-card-title">
                {editingAgence ? "Modifier l'agence" : "Nouvelle Agence"}
              </h2>
              <p className="auth-card-subtitle">
                {editingAgence
                  ? "Modifiez les informations de l'agence"
                  : "Remplissez les informations ci-dessous"}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label className="auth-input-label">Nom de l'agence</label>
                <input
                  className="auth-input"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Agence Tananarive"
                  required
                />
              </div>
              <div className="auth-input-group">
                <label className="auth-input-label">Adresse</label>
                <input
                  className="auth-input"
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: 12 Rue de la Paix, Tananarive"
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading
                  ? editingAgence
                    ? "Modification..."
                    : "Création..."
                  : editingAgence
                    ? "Modifier"
                    : "Enregistrer l'agence"}
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

      {showSecurityModal && securityAgence && (
        <div
          className="modal-overlay"
          onClick={() => !securityLoading && setShowSecurityModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowSecurityModal(false)}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon" style={{ background: "linear-gradient(135deg, var(--primary-color), var(--secondary-color))", color: "white" }}>
                <FiLock size={24} />
              </div>
              <h2 className="auth-card-title">Sécurité Borne</h2>
              <p className="auth-card-subtitle">
                Gérer le verrouillage de l'agence <strong>{securityAgence.nom}</strong>
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSecuritySubmit}>
              <div className="auth-input-group">
                <label className="auth-input-label">Nouveau mot de passe de la borne</label>
                <input
                  className="auth-input"
                  type="password"
                  value={kioskPassword}
                  onChange={(e) => setKioskPassword(e.target.value)}
                  placeholder="Laisser vide pour désactiver"
                />
              </div>
              <button type="submit" className="auth-button" disabled={securityLoading}>
                {securityLoading ? "Enregistrement..." : "Appliquer la sécurité"}
              </button>
              {securityMessage && (
                <div
                  className={`auth-message ${securityIsSuccess ? "auth-message--success" : "auth-message--error"}`}
                  style={{ marginTop: "1rem" }}
                >
                  {securityMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="content-card" ref={tableContainerRef}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Adresse</th>
              <th>Lien Écran</th>
              <th>Lien Borne</th>
              <th>Date de création</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agences.length > 0 ? (
              agences
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((agence) => (
                  <tr key={agence.id}>
                    <td className="font-bold">{agence.nom}</td>
                    <td className="text-secondary">
                      {agence.adresse || "Non renseignée"}
                    </td>
                    <td>
                      {agence.slug ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <a
                            href={`/${agence.slug}/screen`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium text-sm"
                            style={{
                              maxWidth: "120px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                            title={`/${agence.slug}/screen`}
                          >
                            /{agence.slug}/screen
                          </a>
                          <button
                            className="icon-btn"
                            style={{
                              padding: "0.25rem",
                              color: "var(--text-secondary)",
                            }}
                            title="Copier le lien de l'écran"
                            onClick={() => {
                              const fullUrl = `${window.location.origin}/${agence.slug}/screen`;
                              navigator.clipboard.writeText(fullUrl);
                              setMessage(
                                `Lien de l'écran pour ${agence.nom} copié !`,
                              );
                              setIsSuccess(true);
                              setTimeout(() => setMessage(""), 3000);
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-secondary text-sm">
                          Non généré
                        </span>
                      )}
                    </td>
                    <td>
                      {agence.slug ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <a
                            href={`/${agence.slug}/borne`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline font-medium text-sm"
                            style={{
                              maxWidth: "120px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "inline-block",
                            }}
                            title={`/${agence.slug}/borne`}
                          >
                            /{agence.slug}/borne
                          </a>
                          <button
                            className="icon-btn"
                            style={{
                              padding: "0.25rem",
                              color: "var(--text-secondary)",
                            }}
                            title="Copier le lien de la borne"
                            onClick={() => {
                              const fullUrl = `${window.location.origin}/${agence.slug}/borne`;
                              navigator.clipboard.writeText(fullUrl);
                              setMessage(
                                `Lien de la borne pour ${agence.nom} copié !`,
                              );
                              setIsSuccess(true);
                              setTimeout(() => setMessage(""), 3000);
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="14"
                              height="14"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-secondary text-sm">
                          Non généré
                        </span>
                      )}
                    </td>
                    <td className="text-secondary">
                      {agence.created_at
                        ? new Date(agence.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : "---"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="icon-btn"
                        style={{ color: "var(--primary-color)" }}
                        onClick={() => openSecurityModal(agence)}
                        title="Configurer la sécurité de la borne"
                      >
                        <FiLock size={18} />
                      </button>
                      <button
                        className="icon-btn edit"
                        onClick={() => openEditModal(agence)}
                        title="Modifier"
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
                        onClick={() => handleDelete(agence.id)}
                        title="Supprimer"
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
                ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Aucune agence trouvée.
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
              { length: Math.ceil(agences.length / itemsPerPage) },
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
                currentPage === Math.ceil(agences.length / itemsPerPage)
              }
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
            <span className="pagination-info">
              {agences.length} agence{agences.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
