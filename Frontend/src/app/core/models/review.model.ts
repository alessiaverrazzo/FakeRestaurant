/**
 * Modello dati per una Recensione.
 * Rappresenta una recensione lasciata da un utente su un ristorante,
 * incluse le eventuali risposte (struttura ad albero) e i voti ricevuti.
 */
export interface Review {
  id: number;
  userId: number;
  restaurantId: number;

  content: string;
  parentReviewId: number | null;

  createdAt: string;
  updatedAt: string;

  upvotes: number;
  downvotes: number;

  /**
   * Informazioni sull'autore della recensione.
   */
  user?: {
    username: string;
    iconId: number;
  } | null;

  /**
   * Lista delle risposte a questa recensione.
   * Permette di costruire una struttura ad albero (commenti annidati).
   */
  replies: Review[];

  /**
   * Nome del ristorante associato.
   * Utile in contesti dove non è disponibile l'oggetto ristorante completo
   * (es. "Top della settimana").
   */
  restaurantName: string | null;

  /**
   * Voto espresso dall'utente loggato su questa recensione.
   * 1 = upvote, -1 = downvote, 0 = nessun voto.
   */
  userVote?: 1 | -1 | 0;
}
