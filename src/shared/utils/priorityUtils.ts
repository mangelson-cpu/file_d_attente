import type { TicketNiveau } from "../types";

export function getPriorityWeight(niveau: string): number {
  switch (niveau.toLowerCase()) {
    case "vip":
      return 0;
    case "urgent":
      return 1;
    case "normal":
    default:
      return 2;
  }
}

export function sortByPriority<
  T extends { niveau: TicketNiveau | string; created_at: string },
>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    const priorityDiff =
      getPriorityWeight(a.niveau) - getPriorityWeight(b.niveau);
    if (priorityDiff !== 0) return priorityDiff;

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
