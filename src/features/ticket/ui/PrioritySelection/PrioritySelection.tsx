import React, { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { supabase } from "../../../../shared/api/supabaseClient";
import "./PrioritySelection.css";
import normalImg from "../../../../assets/priority_normal.png";
import urgentImg from "../../../../assets/priority_urgent.png";
import vipImg from "../../../../assets/priority_vip.png";

export const PrioritySelection: React.FC = () => {
  const currentTime = new Date();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();
  const [isGenerating, setIsGenerating] = useState(false);

  const basePath = slug ? `/${slug}/borne` : "/ticket";
  const { serviceId, serviceName, agenceId, agenceName } = location.state || {};

  const priorities = [
    { id: "normal", name: "Normal", image: normalImg, color: "#64748b" },
    { id: "urgent", name: "Urgent", image: urgentImg, color: "#f97316" },
    { id: "vip", name: "VIP", image: vipImg, color: "#eab308" },
  ];

  const getTicketPrefix = (serviceName: string): string => {
    const name = (serviceName || "").toLowerCase();
    if (name.includes("retrait")) return "R";
    if (name.includes("depot") || name.includes("dépôt")) return "D";
    if (name.includes("information")) return "I";
    if (name.includes("compte")) return "O";
    return "T";
  };

  const handlePrioritySelect = async (priority: (typeof priorities)[0]) => {
    console.log("PrioritySelection: Starting ticket generation...", {
      serviceId,
      agenceId,
      priority: priority.id,
    });

    if (!serviceId || !agenceId || isGenerating) {
      console.warn(
        "PrioritySelection: Aborting - missing data or already generating",
        { serviceId, agenceId, isGenerating },
      );
      return;
    }

    setIsGenerating(true);
    try {
      const prefix = getTicketPrefix(serviceName);
      const today = new Date().toISOString().split("T")[0];

      const { count, error: countError } = await supabase
        .from("ticket")
        .select("*", { count: "exact", head: true })
        .eq("agence_id", agenceId)
        .like("numero_ticket", `${prefix}%`)
        .gte("created_at", `${today}T00:00:00Z`);

      if (countError)
        console.error("PrioritySelection: Count error:", countError);

      const nextNum = (count || 0) + 1;
      const numeroTicket = `${prefix}${String(nextNum).padStart(3, "0")}`;
      console.log("PrioritySelection: Generated ticket number:", numeroTicket);

      const { data: newTicket, error: insertError } = await supabase
        .from("ticket")
        .insert({
          numero_ticket: numeroTicket,
          agence_id: agenceId,
          service_id: serviceId,
          nom_guichet: null,
          niveau: priority.name,
          status: "waiting",
        })
        .select()
        .single();

      if (insertError) {
        console.error("PrioritySelection: INSERT FAILED:", insertError);
        throw insertError;
      }

      console.log("PrioritySelection: Ticket created successfully!", newTicket);

      navigate(`${basePath}/done`, {
        state: {
          ticket: newTicket,
          serviceName: serviceName,
          priorityName: priority.name,
          agenceName: agenceName,
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error("PrioritySelection: Global error handler:", error);
      alert(
        `Erreur lors de la génération du ticket: ${error.message || "Erreur inconnue"}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!serviceId) {
    return (
      <div className="kiosk-container priority-selection-page">
        <main className="kiosk-main">
          <h2 className="kiosk-page-title">Service non sélectionné</h2>
          <button
            className="kiosk-back-button"
            onClick={() => navigate(basePath)}
          >
            Retour
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="kiosk-container priority-selection-page">
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
            <p className="kiosk-logo-subtitle">Sélection du niveau</p>
          </div>
        </div>
        <div className="kiosk-time-display">
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </header>

      <main className="kiosk-main">
        <div className="kiosk-stepper">
          <div className="step-dot inactive"></div>
          <div className="step-line"></div>
          <div className="step-dot active"></div>
          <div className="step-line"></div>
          <div className="step-dot inactive"></div>
        </div>

        <h2 className="kiosk-page-title">
          Choisissez votre niveau pour {serviceName}
        </h2>

        <div className="priority-cards-grid">
          {priorities.map((priority) => (
            <button
              key={priority.id}
              className={`priority-card ${isGenerating ? "disabled" : ""}`}
              onClick={() => handlePrioritySelect(priority)}
              disabled={isGenerating}
            >
              <div className="priority-card-image-wrapper">
                <img
                  src={priority.image}
                  alt={priority.name}
                  className="priority-image"
                />
              </div>
              <div className="priority-card-footer">
                <div
                  className="priority-dot"
                  style={{ backgroundColor: priority.color }}
                ></div>
                <span className="priority-name">{priority.name}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          className="kiosk-back-button"
          onClick={() => navigate(basePath)}
          disabled={isGenerating}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="back-icon"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Retour</span>
        </button>
      </main>
    </div>
  );
};
