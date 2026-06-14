/**
 * DTO (Data Transfer Object) per l'esposizione dei dati di una notifica.
 * Utilizzato per inviare al frontend le informazioni sulle notifiche dell'utente.
 */
export class NotificationDTO {
  id: number;
  /** ID dell'utente destinatario della notifica */
  user_id: number;
  /** Tipo di evento: 'upvote', 'downvote', 'new_review', 'review_reply', 'reply' */
  type: string;
  /** ID dell'utente che ha generato l'evento (attore) */
  actor_id: number;
  /** Tipo dell'entità target: 'restaurant' o 'review' */
  target_type: string;
  /** ID dell'entità target */
  target_id: number;
  /** Stato di lettura della notifica */
  is_read: boolean;
  created_at: Date;
  /** Username dell'attore (opzionale, per visualizzazione) */
  actor_username?: string;

  // Campi opzionali per facilitare la navigazione nel frontend
  review_id?: number | null;
  restaurant_id?: number | null;
  reply_id?: number | null;

  constructor(data: {
    id: number;
    user_id: number;
    type: string;
    actor_id: number;
    target_type: string;
    target_id: number;
    is_read: boolean;
    created_at: Date;
    actor_username?: string;
    review_id?: number | null;
    restaurant_id?: number | null;
    reply_id?: number | null;
  }) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.type = data.type;
    this.actor_id = data.actor_id;
    this.target_type = data.target_type;
    this.target_id = data.target_id;
    this.is_read = data.is_read;
    this.created_at = data.created_at;
    this.actor_username = data.actor_username;
    this.review_id = data.review_id ?? null;
    this.restaurant_id = data.restaurant_id ?? null;
    this.reply_id = data.reply_id ?? null;
  }
}

/**
 * DTO per l'aggiornamento di una notifica.
 * Utilizzato principalmente per segnare una notifica come letta.
 */
export class UpdateNotificationDTO {
  id: number;
  is_read: boolean;

  constructor(data: { id: number; is_read: boolean }) {
    this.id = data.id;
    this.is_read = data.is_read;
  }
}
