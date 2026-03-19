import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../../shared/api/supabaseClient";
import { FiUser } from "react-icons/fi";

interface NavbarProps {
    onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from("users").select("nom_user, email, role").eq("id", user.id).single();
                if (data) setCurrentUser(data);
            }
        };
        fetchUser();
    }, []);

    // Close profile popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


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
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                                            <span className={`status-badge ${currentUser.role} popover-role`}>
                                                {currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin' : 'Utilisateur'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="profile-popover-actions">
                                        <button onClick={onLogout} className="profile-signout-btn">
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                                <polyline points="16 17 21 12 16 7" />
                                                <line x1="21" y1="12" x2="9" y2="12" />
                                            </svg>
                                            <span>Se déconnecter</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="profile-avatar-placeholder"></div>
                    )}
                </div>
            </div>
        </header>
    );
};
