import type { Ticket } from "../types";

export function getPriorityWeight(niveau: string): number {
  switch (niveau.toLowerCase()) {
    case "vip":
      return 0;
    case "urgent":
      return 1;
    case "normal":
    default:
      return 1000; // Using a high number for unknown priorities
  }
}

export function sortByPriority<T extends Ticket>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    // If priority object is present, use its valeur
    const aWeight = a.priority ? a.priority.valeur : getPriorityWeight(a.niveau || "");
    const bWeight = b.priority ? b.priority.valeur : getPriorityWeight(b.niveau || "");

    const priorityDiff = aWeight - bWeight;
    if (priorityDiff !== 0) return priorityDiff;

    // Use creation time as fallback
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
