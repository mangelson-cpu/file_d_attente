import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../shared/api/supabaseClient";
import { FiUser } from "react-icons/fi";

interface NavbarProps {
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    nom_user: string;
    email: string;
    role: string;
    agence_id: string | null;
  } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [editNom, setEditNom] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editOldPassword, setEditOldPassword] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("id, nom_user, email, role, agence_id")
          .eq("id", user.id)
          .single();
        if (data) {
          setCurrentUser({ ...data, id: user.id });
          setEditNom(data.nom_user);
          setEditEmail(data.email);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("update_user_secure", {
        p_user_id: currentUser.id,
        p_email: editEmail,
        p_password: editPassword || null,
        p_nom_user: editNom,
        p_role: currentUser.role,
        p_agence_id: currentUser.agence_id || null,
        p_old_password: editOldPassword || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };

      if (!result.success) {
        setMessage(result.message);
        setIsSuccess(false);
        return;
      }

      setMessage("Profil mis à jour avec succès");
      setIsSuccess(true);
      setCurrentUser({ ...currentUser, email: editEmail, nom_user: editNom });
      setEditOldPassword("");
      setEditPassword("");

      setTimeout(() => {
        setIsProfileEditOpen(false);
        setMessage("");
      }, 1500);
    } catch (err) {
      const error = err as Error;
      setMessage(error.message || "Erreur lors de la mise à jour");
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-breadcrumb">
          <span className="breadcrumb-item">Administration</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">Tableau de bord</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-actions">
          <button className="navbar-icon-btn" title="Paramètres">
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="navbar-divider"></div>

        <div className="navbar-user" ref={profileRef}>
          {currentUser ? (
            <div className="profile-badge-container">
              <button
                className="profile-avatar-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                title="Profil"
              >
                <FiUser size={20} />
              </button>

              {isProfileOpen && (
                <div className="profile-popover">
                  <div className="profile-popover-header">
                    <div className="profile-popover-avatar">
                      <FiUser size={36} />
                    </div>
                    <div className="profile-popover-info">
                      <div className="profile-name">{currentUser.nom_user}</div>
                      <div className="profile-email">{currentUser.email}</div>
                      <span
                        className={`status-badge ${currentUser.role} popover-role`}
                      >
                        {currentUser.role === "super_admin"
                          ? "Super Admin"
                          : currentUser.role === "admin"
                            ? "Admin"
                            : "Utilisateur"}
                      </span>
                    </div>
                  </div>
                  <div className="profile-popover-actions">
                    <button onClick={() => { setIsProfileEditOpen(true); setIsProfileOpen(false); }} className="profile-signout-btn">
                      <FiUser size={18} style={{ marginRight: "0.5rem" }} />
                      <span>Mon Profil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="profile-avatar-placeholder"></div>
          )}
        </div>

        <div className="navbar-divider"></div>

        <div className="navbar-actions">
          <button 
            className="navbar-icon-btn" 
            title="Se déconnecter" 
            onClick={onLogout}
            style={{ width: 'auto', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Déconnexion</span>
          </button>
        </div>
      </div>

      {isProfileEditOpen && currentUser && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setIsProfileEditOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setIsProfileEditOpen(false)}
            >
              ×
            </button>
            <div className="auth-card-header" style={{ marginBottom: "2rem" }}>
              <div className="auth-card-icon">👤</div>
              <h2 className="auth-card-title">Mon Profil</h2>
              <p className="auth-card-subtitle">
                Modifiez vos informations personnelles
              </p>
            </div>

            <form className="auth-form" onSubmit={handleProfileEditSubmit}>
              <div className="auth-input-grid">
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Nom complet</label>
                  <input
                    className="auth-input"
                    type="text"
                    value={editNom}
                    onChange={(e) => setEditNom(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Email</label>
                  <input
                    className="auth-input"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Ancien mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={editOldPassword}
                    onChange={(e) => setEditOldPassword(e.target.value)}
                    placeholder="Saisissez-le pour modifier votre mot de passe"
                  />
                </div>
                <div className="auth-input-group" style={{ gridColumn: "span 2" }}>
                  <label className="auth-input-label">Nouveau mot de passe</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Laissez vide si vous ne souhaitez pas le changer"
                    minLength={6}
                  />
                </div>
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? "Mise à jour..." : "Mettre à jour le profil"}
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
    </header>
  );
};
