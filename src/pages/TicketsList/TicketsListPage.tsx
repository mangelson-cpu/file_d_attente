import React from "react";
import type { UserRole } from "../../shared/types";
import { AgentTicketManager } from "../../features/ticket/ui/AgentTicketManager/AgentTicketManager";

interface Props {
    userRole: UserRole;
    currentUserAgenceId: string | null;
}

export const TicketsListPage: React.FC<Props> = ({ userRole }) => {
    if (userRole === "user") {
        return <AgentTicketManager />;
    }

    return (
        <div className="services-page">
            <header className="page-header">
                <div className="header-text">
                    <h1>Liste des Tickets</h1>
                    <p>Consultez et gérez les tickets</p>
                </div>
            </header>
            <div className="content-card" style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                Bientôt disponible pour les administrateurs.
            </div>
        </div>
    );
};
