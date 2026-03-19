import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";
import { supabase } from "../../../shared/api/supabaseClient";
import type { Service, UserRole } from "../../../shared/types";
import { SousServiceModal } from "./SousServiceModal";

interface Props {
  userRole: UserRole;
}

export const ServiceManager: React.FC<Props> = ({ userRole }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServiceForSousService, setSelectedServiceForSousService] =
    useState<Service | null>(null);

  const [nomService, setNomService] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(tableContainerRef, services.length);

  const isSuperAdmin = userRole === "super_admin";

  const fetchServices = useCallback(async (ignore: boolean = false) => {
    console.log("ServiceManager: Début du fetchServices");
    setFetchError("");
    try {
      const { data, error } = await supabase
        .from("service")
        .select("*, sous_service(*)")
        .order("created_at", { ascending: false });

      console.log("ServiceManager: Réponse reçue", { data, error });

      if (error) throw error;

      if (ignore) return;

      if (data) {
        setServices(data as Service[]);
        setCurrentPage(1);
      }
    } catch (err: any) {
      if (ignore) return;
      console.error("Erreur lors de la récupération des services:", err);
      setFetchError(err.message || "Impossible de charger les services");
      setServices([]);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadServices = async () => {
      await fetchServices(ignore);
    };

    loadServices();

    const channel = supabase
      .channel("sous_service_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sous_service",
        },
        () => {
          fetchServices(ignore);
        },
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [fetchServices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomService.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      if (editingService) {
        const { error } = await supabase
          .from("service")
          .update({ nom_service: nomService.trim() })
          .eq("id", editingService.id);

        if (error) throw error;
        setMessage("Service modifié avec succès");
      } else {
        const { error } = await supabase
          .from("service")
          .insert({ nom_service: nomService.trim() });

        if (error) throw error;
        setMessage("Service créé avec succès");
      }

      setIsSuccess(true);

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage("");
      }, 1000);

      await fetchServices();
    } catch (err: any) {
      console.error("Erreur handleSubmit:", err);
      setMessage(err.message || "Erreur lors de l'opération");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce service ?")) return;

    try {
      const { error } = await supabase.from("service").delete().eq("id", id);
      if (error) throw error;
      await fetchServices();
    } catch (err: any) {
      console.error("Erreur delette:", err);
      alert(err.message || "Erreur lors de la suppression");
    }
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setNomService(service.nom_service);
    setShowModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setNomService("");
    setEditingService(null);
    setMessage("");
    setIsSuccess(false);
  };

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des services</h1>
          <p>Gérez les services de votre agence</p>
        </div>
        {isSuperAdmin && (
          <button className="primary-gradient-btn" onClick={openCreateModal}>
            + Créer un service
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
              <div className="auth-card-icon">🛠️</div>
              <h2 className="auth-card-title">
                {editingService ? "Modifier le service" : "Nouveau Service"}
              </h2>
              <p className="auth-card-subtitle">
                {editingService
                  ? "Modifiez le nom du service"
                  : "Remplissez les informations ci-dessous"}
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-group">
                <label className="auth-input-label">Nom du service</label>
                <input
                  className="auth-input"
                  type="text"
                  value={nomService}
                  onChange={(e) => setNomService(e.target.value)}
                  placeholder="Ex: Dépôt, Retrait, Information..."
                  required
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading
                  ? editingService
                    ? "Modification..."
                    : "Création..."
                  : editingService
                    ? "Modifier"
                    : "Enregistrer le service"}
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

      {selectedServiceForSousService && (
        <SousServiceModal
          service={selectedServiceForSousService}
          onClose={() => setSelectedServiceForSousService(null)}
          onSousServicesChange={() => fetchServices()}
        />
      )}

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
              <th>Nom du service</th>
              <th>Sous-services</th>
              <th>Date de création</th>
              {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {services.length > 0 &&
              services
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((service) => (
                  <tr key={service.id}>
                    <td className="font-bold">{service.nom_service}</td>
                    <td>
                      {service.sous_service &&
                      service.sous_service.length > 0 ? (
                        <select
                          className="auth-input"
                          style={{
                            padding: "0.2rem 0.5rem",
                            fontSize: "0.85rem",
                            maxWidth: "200px",
                            backgroundColor: "var(--bg-glass)",
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Voir les {service.sous_service.length} sous-services
                          </option>
                          {service.sous_service.map((ss) => (
                            <option key={ss.id} value={ss.id} disabled>
                              {ss.nom_sous_service}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="text-secondary"
                          style={{ fontSize: "0.8rem", fontStyle: "italic" }}
                        >
                          Aucun
                        </span>
                      )}
                    </td>
                    <td className="text-secondary">
                      {service.created_at
                        ? new Date(service.created_at).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : "---"}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="icon-btn edit"
                          onClick={() =>
                            setSelectedServiceForSousService(service)
                          }
                          title="Gérer les sous-services"
                          disabled={loading}
                          style={{
                            marginRight: "10px",
                            color: "var(--primary-color)",
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                        <button
                          className="icon-btn edit"
                          onClick={() => openEditModal(service)}
                          title="Modifier"
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
                          onClick={() => handleDelete(service.id)}
                          title="Supprimer"
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
                    )}
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
              { length: Math.ceil(services.length / itemsPerPage) },
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
                currentPage === Math.ceil(services.length / itemsPerPage)
              }
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
            <span className="pagination-info">
              {services.length} service{services.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
