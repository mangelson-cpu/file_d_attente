import React, { useEffect, useState } from "react";
import { supabase } from "../../../shared/api/supabaseClient";
import { KioskLogin } from "../../../pages/Kiosk/KioskLogin";

interface KioskAuthGuardProps {
  agenceId?: string | null;
  children: React.ReactNode;
}

export const KioskAuthGuard: React.FC<KioskAuthGuardProps> = ({ agenceId, children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuthStatus = async () => {
      if (!agenceId) {
        if (isMounted) {
          setIsAuthenticated(true);
          setLoading(false);
        }
        return;
      }
      const authKey = `kiosk_auth_${agenceId}`;
      const hasAuth = sessionStorage.getItem(authKey) === "true";

      if (hasAuth) {
        if (isMounted) {
          setIsAuthenticated(true);
          setLoading(false);
        }
        return;
      }

      // If no valid session, check if a password is even required for this kiosk
      try {
        const { data, error } = await supabase.rpc("verify_kiosk_password", {
          p_agence_id: agenceId,
          p_password: "", // passing empty password to see if one is required
        });

        if (error) throw error;

        // If it returns true with empty password, it means NO password is set.
        if (data === true) {
          sessionStorage.setItem(authKey, "true");
          if (isMounted) setIsAuthenticated(true);
        } else {
          // Password is set and required
          if (isMounted) setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Error checking kiosk security:", err);
        // Default to not authenticated if we can't verify (safer)
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuthStatus();

    return () => {
      isMounted = false;
    };
  }, [agenceId]);

  const handleLoginSuccess = () => {
    sessionStorage.setItem(`kiosk_auth_${agenceId}`, "true");
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader-spinner"></div>
      </div>
    );
  }

  if (!agenceId || isAuthenticated) return <>{children}</>;

  return <KioskLogin agenceId={agenceId} onSuccess={handleLoginSuccess} />;
};
