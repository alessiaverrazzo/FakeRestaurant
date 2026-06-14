/**
 * Modello dati per la card di anteprima di una Recensione.
 * Utilizzato nelle liste (Home, Profilo) per visualizzare il contenuto e i voti.
 */
export interface ReviewCard {
  id: number;
  restaurantId: number;
  /** Nome del ristorante recensito (utile per il link). */
  restaurantName: string | null;

  content: string;

  upvotes: number;
  downvotes: number;

  /** Voto espresso dall'utente corrente su questa recensione. */
  userVote: 1 | -1 | 0;

  /** Dati dell'autore della recensione. */
  user?: {
    username: string;
    iconId: number;
  } | null;

  createdAt: string;
}
