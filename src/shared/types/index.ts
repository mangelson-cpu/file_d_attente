export type UserRole = "super_admin" | "admin" | "user";

export interface Agence {
  id: string;
  nom: string;
  adresse: string | null;
  slug?: string;
  created_at: string;
}

export interface Service {
  id: string;
  nom_service: string;
  created_at: string;
  sous_service?: SousService[];
}

export interface Guichet {
  id: string;
  nom_guichet: string;
  appellation: string | null;
  agence_id: string;
  created_at: string;
}

export interface SousService {
  id: string;
  nom_sous_service: string;
  service_id: string;
  created_at: string;
  service?: Service;
}

export interface User {
  id: string;
  nom_user: string;
  email: string;
  role: UserRole;
  agence_id: string | null;
  created_at: string;
  agence?: Agence;
}

export interface GuichetService {
  id: string;
  nom_guichet: string;
  service_id: string;
  agence_id: string;
  created_at: string;
  service?: Service;
  agence?: Agence;
}

export type TicketStatus =
  | "waiting"
  | "ready"
  | "called"
  | "done"
  | "cancelled";
export type TicketNiveau = "Normal" | "Urgent" | "VIP";

export interface Ticket {
  id: string;
  numero_ticket: string;
  service_id: string;
  agence_id: string;
  nom_guichet: string | null;
  user_id: string | null;
  sous_service_id?: string | null;
  niveau: TicketNiveau;
  status: TicketStatus;
  date_debut: string | null;
  date_fin: string | null;
  created_at: string;
  service?: Service;
  sous_service?: SousService;
  agence?: Agence;
  agent?: {
    nom_user: string;
  };
}
