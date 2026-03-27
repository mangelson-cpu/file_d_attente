import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDynamicPageSize } from "../../../shared/hooks/useDynamicPageSize";
import { supabase } from "../../../shared/api/supabaseClient";
import type { UserRole, Agence, User } from "../../../shared/types";

interface Props {
  agences: Agence[];
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const CreateUserForm: React.FC<Props> = ({
  agences,
  userRole,
  currentUserAgenceId,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { itemsPerPage, needsPagination } = useDynamicPageSize(
    tableContainerRef,
    users.length,
  );

  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [agenceId, setAgenceId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (userRole === "admin" && currentUserAgenceId) {
      setAgenceId(currentUserAgenceId);
    }
  }, [userRole, currentUserAgenceId, showModal]);

  const fetchUsers = useCallback(async (ignore: boolean = false) => {
    setFetchError("");
    try {
      const query = supabase.from("users").select(`
          *,
          agence:agence_id (id, nom)
        `);

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) {
        throw error;
      }

      if (ignore) return;

      if (data) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        const filteredUsers = (data as User[]).filter(
          (u) => u.id !== currentUserId,
        );
        setUsers(filteredUsers);
        setCurrentPage(1);
      }
    } catch (err) {
      if (ignore) return;
      console.error("fetchUsers erreur:", err);
      const error = err as Error;
      setFetchError(
        error.message || "Erreur réseau inconnue lors du chargement.",
      );
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadUsers = async () => {
      await fetchUsers(ignore);
    };

    loadUsers();

    return () => {
      ignore = true;
    };
  }, [fetchUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("create_user_secure", {
        p_email: email,
        p_password: password,
        p_nom_user: nom,
        p_role: role,
        p_agence_id: agenceId || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (!result.success) {
        setMessage(result.message);
        setIsSuccess(false);
        return;
      }

      setMessage("Utilisateur créé avec succès");
      setIsSuccess(true);

      setTimeout(() => {
        setShowModal(false);
        resetForm();
        setMessage("");
      }, 1500);

      fetchUsers();
    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de la création");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setNom(user.nom_user);
    setEmail(user.email);
    setPassword("");
    setRole(user.role as "user" | "admin");
    setAgenceId(user.agence_id || user.agence?.id || "");
    setShowEditModal(true);
    setMessage("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("update_user_secure", {
        p_user_id: editingUser.id,
        p_email: email,
        p_password: password || null,
        p_nom_user: nom,
        p_role: role,
        p_agence_id: agenceId || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (!result.success) {
        setMessage(result.message);
        setIsSuccess(false);
        return;
      }

      setMessage("Utilisateur mis à jour avec succès");
      setIsSuccess(true);

      fetchUsers();

      setTimeout(() => {
        setShowEditModal(false);
        resetForm();
      }, 1500);

    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de la mise à jour");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setNom("");
    setPassword("");
    setRole("user");
    setEditingUser(null);

    if (userRole !== "admin") {
      setAgenceId("");
    }
    setMessage("");
    setIsSuccess(false);
  };

  return (
    <div className="agents-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Gestion des agents</h1>
          <p>
            {userRole === "super_admin"
              ? "Administration globale des utilisateurs"
              : "Gérez les agents de votre agence"}
          </p>
        </div>
        <button
          className="primary-gradient-btn"
          onClick={() => setShowModal(true)}
        >
          + Créer un agent
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
              <div className="auth-card-icon">👤</div>
              <h2 className="auth-card-title">Nouvel Agent</h2>
              <p className="auth-card-subtitle">
                Remplissez les informations ci-dessous
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-input-grid">
                <div className="auth-input-group">
                  <label className="auth-input-label">Nom complet</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Rôle</label>
                  <select
                    className="auth-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "user" | "admin")}
                    disabled={userRole === "admin"}
                  >
                    <option value="user">Utilisateur</option>
                    {userRole === "super_admin" && (
                      <option value="admin">Administrateur</option>
                    )}
                  </select>
                </div>
                <div
                  className="auth-input-group"
                  style={{ gridColumn: "span 2" }}
                >
                  <label className="auth-input-label">Agence</label>
                  <select
                    className="auth-select"
                    value={agenceId}
                    onChange={(e) => setAgenceId(e.target.value)}
                    disabled={userRole === "admin"}
                  >
                    <option value="">
                      {userRole === "super_admin"
                        ? "Aucune agence (Super Admin)"
                        : "Sélectionner une agence"}
                    </option>
                    {agences.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                  {userRole === "admin" && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        marginTop: "0.4rem",
                      }}
                    >
                      En tant qu'administrateur, vous créez des agents pour
                      votre propre agence.
                    </p>
                  )}
                </div>
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Création..." : "Enregistrer l'agent"}
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

      {showEditModal && editingUser && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setShowEditModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon">✏️</div>
              <h2 className="auth-card-title">Modifier l'agent</h2>
              <p className="auth-card-subtitle">
                Modifiez les informations de l'agent
              </p>
            </div>

            <form className="auth-form" onSubmit={handleEditSubmit}>
              <div className="auth-input-grid">
                <div className="auth-input-group">
                  <label className="auth-input-label">Nom complet</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Nouveau mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Laisser vide pour ne pas changer"
                    minLength={6}
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Rôle</label>
                  <select
                    className="auth-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "user" | "admin")}
                    disabled={userRole === "admin"}
                  >
                    <option value="user">Utilisateur</option>
                    {userRole === "super_admin" && (
                      <option value="admin">Administrateur</option>
                    )}
                    {editingUser.role === "super_admin" && (
                      <option value="super_admin">Super Administrateur</option>
                    )}
                  </select>
                </div>
                <div
                  className="auth-input-group"
                  style={{ gridColumn: "span 2" }}
                >
                  <label className="auth-input-label">Agence</label>
                  <select
                    className="auth-select"
                    value={agenceId}
                    onChange={(e) => setAgenceId(e.target.value)}
                    disabled={userRole === "admin"}
                  >
                    <option value="">
                      {userRole === "super_admin"
                        ? "Aucune agence (Super Admin)"
                        : "Sélectionner une agence"}
                    </option>
                    {agences.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour l'agent"}
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
              <th>Nom</th>
              <th>Email</th>
              <th>Agence</th>
              <th>Rôle</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users
              .slice(
                (currentPage - 1) * itemsPerPage,
                currentPage * itemsPerPage,
              )
              .map((user) => (
                <tr key={user.id}>
                  <td className="font-bold">{user.nom_user}</td>
                  <td className="text-secondary">{user.email}</td>
                  <td>{user.agence?.nom || "Non assignée"}</td>
                  <td>
                    <span className={`status-badge ${user.role}`}>
                      {user.role === "super_admin"
                        ? "Super User"
                        : user.role === "admin"
                          ? "Admin"
                          : "User"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="icon-btn edit"
                      onClick={() => openEditModal(user)}
                      disabled={userRole !== "super_admin" && user.role === "super_admin"}
                      style={userRole !== "super_admin" && user.role === "super_admin" ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                      title={userRole !== "super_admin" && user.role === "super_admin" ? "Non autorisé" : "Modifier"}
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
                    <button className="icon-btn delete">
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
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ←
            </button>
            {Array.from(
              { length: Math.ceil(users.length / itemsPerPage) },
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
              disabled={currentPage === Math.ceil(users.length / itemsPerPage)}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              →
            </button>
            <span className="pagination-info">
              {users.length} agent{users.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
