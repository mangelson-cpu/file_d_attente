import React, { useState } from "react";
import { supabase } from "../../../shared/api/supabaseClient";
import { FiLock } from "react-icons/fi";

import type { UserRole } from "../../../shared/types";

interface Props {
  onLogin: (role: UserRole) => void;
}

export const LoginForm: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(
          error.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect"
            : error.message,
        );
      }

      const fetchProfile = async (
        userId: string,
        retries = 5,
      ): Promise<{ role: string | null; error: unknown }> => {
        let lastError = null;
        for (let i = 0; i < retries; i++) {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .single();

          if (profile && !profileError) {
            return { role: profile.role, error: null };
          }

          lastError = profileError;
          console.warn(
            `Tentative de chargement du profil ${i + 1}/${retries} échouée...`,
            profileError,
          );

          if (i < retries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
        return { role: null, error: lastError };
      };

      const { role, error: fetchError } = await fetchProfile(data.user.id);

      if (!role) {
        console.error(
          "Erreur fatale lors de la récupération du profil:",
          fetchError,
        );
        const typedError = fetchError as { code?: string, message?: string };
        throw new Error(
          typedError?.code === "PGRST116"
            ? "Profil introuvable dans la table 'users'."
            : `Erreur de permission (RLS) : ${typedError?.message || "Inconnue"}. Vérifiez vos politiques Supabase.`,
        );
      }

      setMessage("Connexion réussie !");
      setIsError(false);
      onLogin(role as UserRole);
    } catch (err) {
      setIsError(true);
      if (err instanceof Error) setMessage(err.message);
      else setMessage("Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-card-icon"><FiLock style={{ color: 'var(--primary-color)' }} /></div>
          <h2 className="auth-card-title">Connexion</h2>
          <p className="auth-card-subtitle">
            Gérez vos tickets en toute simplicité
          </p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="auth-input"
              type="email"
              placeholder="jean@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label" htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={`auth-button ${loading ? "auth-button--loading" : ""}`}
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          {message && (
            <div
              className={`auth-message ${isError ? "auth-message--error" : "auth-message--success"}`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
