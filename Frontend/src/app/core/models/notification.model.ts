/**
 * Tipi di notifica specifici per l'interfaccia utente.
 *
 * Nota: Il backend utilizza tipi generici (es. "upvote", "downvote") combinati con "targetType".
 * Nel frontend, questi vengono distinti in 6 tipi espliciti per semplificare la logica di visualizzazione.
 */
export type NotificationType =
  | 'upvote_restaurant'
  | 'downvote_restaurant'
  | 'upvote_review'
  | 'downvote_review'
  | 'new_review'
  | 'reply';

/**
 * Modello dati per una notifica.
 * Rappresenta la struttura JSON normalizzata utilizzata dal frontend, ottimizzata per i componenti UI.
 */
export interface Notification {
  id: number;
  userId: number;
  actorId: number;
  targetType: 'restaurant' | 'review';
  targetId: number;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  actorUsername?: string;
  reviewId: number | null;
  replyId: number | null;
  restaurantId: number | null;

  /** Flag opzionale per indicare visivamente se la notifica è nuova */
  isNew?: boolean;
}
