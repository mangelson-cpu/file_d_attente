import type { TicketNiveau } from "../types";

/**
 * Retourne un poids numérique pour le tri par priorité.
 * VIP = 0 (passe en premier), Urgent = 1, Normal = 2 (passe en dernier).
 */
export function getPriorityWeight(niveau: string): number {
    switch (niveau.toLowerCase()) {
        case "vip": return 0;
        case "urgent": return 1;
        case "normal":
        default: return 2;
    }
}

/**
 * Trie un tableau de tickets par priorité (VIP > Urgent > Normal),
 * puis par date de création (les plus anciens d'abord) pour les tickets de même priorité.
 */
export function sortByPriority<T extends { niveau: TicketNiveau | string; created_at: string }>(
    tickets: T[]
): T[] {
    return [...tickets].sort((a, b) => {
        const priorityDiff = getPriorityWeight(a.niveau) - getPriorityWeight(b.niveau);
        if (priorityDiff !== 0) return priorityDiff;
        // Même priorité → le plus ancien d'abord
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
}
