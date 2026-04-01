import React, { useState } from "react";
import { supabase } from "../../shared/api/supabaseClient";
import { FiLock, FiArrowRight, FiShield } from "react-icons/fi";
import "./KioskLogin.css";

interface KioskLoginProps {
  agenceId: string;
  onSuccess: () => void;
}

export const KioskLogin: React.FC<KioskLoginProps> = ({ agenceId, onSuccess }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Veuillez entrer le mot de passe.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: rpcError } = await supabase.rpc("verify_kiosk_password", {
        p_agence_id: agenceId,
        p_password: password,
      });

      if (rpcError) throw rpcError;

      if (data === true) {
        onSuccess();
      } else {
        setError("Mot de passe incorrect.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kiosk-container kiosk-login-page">
      <div className="kiosk-bg-decorator shape-1"></div>
      <div className="kiosk-bg-decorator shape-2"></div>
      <div className="kiosk-bg-decorator shape-3"></div>

      <header className="kiosk-header">
        <div className="kiosk-logo-group">
          <div className="kiosk-logo-circle">
            <span className="kiosk-logo-letter">B</span>
          </div>
          <div className="kiosk-logo-text-col">
            <h1 className="kiosk-logo-title">Baobab Ticket</h1>
            <p className="kiosk-logo-subtitle">Accès restreint</p>
          </div>
        </div>
      </header>

      <main className="kiosk-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', zIndex: 10 }}>
        <div className="kiosk-login-card" style={{ width: '100%', maxWidth: '650px', backgroundColor: 'var(--card-bg)', padding: '4rem', borderRadius: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '2px solid rgba(255, 255, 255, 0.1)', animation: 'slideUp 0.5s ease forwards' }}>
          <div className="kiosk-login-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="kiosk-login-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '90px', height: '90px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', color: 'white', borderRadius: '50%', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <FiShield size={44} />
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Borne Verrouillée</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', lineHeight: '1.6', margin: 0 }}>Cette borne nécessite une authentification <br />pour être déverrouillée.</p>
          </div>

          <form onSubmit={handleLogin} className="kiosk-login-form" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="kiosk-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label htmlFor="kiosk-pwd" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <FiLock size={20} /> Mot de passe
              </label>

              <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                <input
                  id="kiosk-pwd"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  style={{ flex: 1, padding: '1.5rem', backgroundColor: 'var(--bg-primary)', border: '2px solid var(--border-color)', borderRadius: '1.25rem', fontSize: '1.5rem', color: 'var(--text-primary)', transition: 'all 0.2s', letterSpacing: '8px', textAlign: 'center' }}
                />

                <button type="submit" disabled={loading || !password} style={{ width: '80px', flexShrink: 0, padding: 0, background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', color: 'white', border: 'none', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (loading || !password) ? 'not-allowed' : 'pointer', opacity: (loading || !password) ? 0.6 : 1, boxShadow: '0 8px 16px rgba(0,0,0,0.3)', transition: 'transform 0.2s, opacity 0.2s' }}>
                  {loading ? <span className="loader-spinner" style={{ width: '24px', height: '24px' }}></span> : <FiArrowRight size={32} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="kiosk-error-message" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '1rem', fontSize: '1.1rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                {error}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};
