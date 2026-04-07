import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../../shared/api/supabaseClient";
import type { Priority, AgencePriority, UserRole } from "../../../shared/types";

interface Props {
  userRole: UserRole;
  currentUserAgenceId: string | null;
}

export const PriorityAssignment: React.FC<Props> = ({ userRole, currentUserAgenceId }) => {
  const [globalPriorities, setGlobalPriorities] = useState<Priority[]>([]);
  const [agencyPriorities, setAgencyPriorities] = useState<AgencePriority[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchGlobalPriorities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("priority")
        .select("*")
        .order("valeur", { ascending: true });

      if (error) throw error;
      if (data) {
        setGlobalPriorities(data as Priority[]);
      }
    } catch (err) {
      console.error("Error fetching global priorities:", err);
      setFetchError("Impossible de charger le catalogue des priorités.");
    }
  }, []);

  const fetchAgencyPriorities = useCallback(async () => {
    if (!currentUserAgenceId) return;
    try {
      const { data, error } = await supabase
        .from("agence_priority")
        .select("*")
        .eq("agence_id", currentUserAgenceId);

      if (error) throw error;
      if (data) {
        setAgencyPriorities(data as AgencePriority[]);
      }
    } catch (err) {
      console.error("Error fetching agency priorities:", err);
    }
  }, [currentUserAgenceId]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchGlobalPriorities(), fetchAgencyPriorities()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchGlobalPriorities, fetchAgencyPriorities]);

  const togglePriority = async (priorityId: string) => {
    if (!currentUserAgenceId) return;

    const existing = agencyPriorities.find(ap => ap.priority_id === priorityId);
    
    try {
      if (existing) {
        const { error } = await supabase
          .from("agence_priority")
          .update({ is_active: !existing.is_active })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agence_priority")
          .insert({
            agence_id: currentUserAgenceId,
            priority_id: priorityId,
            is_active: true
          });

        if (error) throw error;
      }
      
      await fetchAgencyPriorities();
    } catch (err) {
      const error = err as Error;
      console.error("Error toggling priority:", error);
      alert(error.message || "Erreur lors de la modification");
    }
  };

  if (!currentUserAgenceId && userRole !== "super_admin") {
    return <div className="p-4 text-center">Aucune agence associée à votre compte.</div>;
  }

  return (
    <div className="services-page">
      <header className="page-header">
        <div className="header-text">
          <h1>Configuration des priorités</h1>
          <p>Activez ou désactivez les niveaux de priorité disponibles sur votre borne.</p>
        </div>
      </header>

      <div className="content-card">
        {fetchError && (
          <div className="auth-message auth-message--error" style={{ marginBottom: "1rem" }}>
            {fetchError}
          </div>
        )}
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>Chargement...</div>
        ) : (
          <div className="priority-assignment-grid" style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
            gap: "20px",
            padding: "10px"
          }}>
            {globalPriorities.map((priority) => {
              const agencyPriority = agencyPriorities.find(ap => ap.priority_id === priority.id);
              const isActive = agencyPriority ? agencyPriority.is_active : false;

              return (
                <div key={priority.id} className={`priority-assign-card ${isActive ? 'active' : ''}`} style={{
                  background: "var(--bg-glass)",
                  border: `1px solid ${isActive ? priority.couleur : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: "15px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  <div style={{ 
                    position: "absolute", 
                    top: "0", 
                    right: "0", 
                    width: "4px", 
                    height: "100%", 
                    backgroundColor: priority.couleur 
                  }}></div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ margin: "0", fontSize: "1.2rem", fontWeight: "bold" }}>{priority.nom}</h3>
                      <p style={{ margin: "5px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        Poids: {priority.valeur} | Icône: {priority.icone}
                      </p>
                    </div>
                    <div style={{ 
                      width: "30px", 
                      height: "30px", 
                      borderRadius: "50%", 
                      backgroundColor: priority.couleur,
                      boxShadow: `0 0 15px ${priority.couleur}44`
                    }}></div>
                  </div>

                  <div style={{ marginTop: "auto", display: "flex", justifyContent: "flex-end" }}>
                    <button 
                      onClick={() => togglePriority(priority.id)}
                      className={`auth-button ${isActive ? '' : 'auth-button--outline'}`}
                      style={{ 
                        padding: "8px 20px", 
                        fontSize: "0.9rem",
                        width: "auto",
                        minWidth: "120px",
                        backgroundColor: isActive ? priority.couleur : "transparent",
                        borderColor: priority.couleur,
                        color: isActive ? "#fff" : priority.couleur,
                        boxShadow: isActive ? `0 4px 15px ${priority.couleur}66` : "none"
                      }}
                    >
                      {isActive ? "✓ Activé" : "Désactivé"}
                    </button>
                  </div>
                </div>
              );
            })}
            
            {globalPriorities.length === 0 && !loading && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", fontStyle: "italic", opacity: 0.6 }}>
                Aucune priorité disponible dans le catalogue global.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
