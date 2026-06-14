/**
 * Modello utente per la pagina del profilo.
 * Contiene le informazioni personali visualizzate nell'header del profilo.
 */
export interface ProfileUser {
  id: number;
  username: string;
  email: string;
  iconId: number;
}

/**
 * Modello ridotto per la card del ristorante nella lista "I miei ristoranti".
 */
export interface ProfileRestaurantCard {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  upvotes: number;
  downvotes: number;
}

/**
 * Modello ridotto per la card della recensione nella lista "Le mie recensioni".
 */
export interface ProfileReviewCard {
  id: number;

  restaurantId: number;
  /** Nome del ristorante recensito (utile per il link). */
  restaurantName: string | null;

  content: string;

  upvotes: number;
  downvotes: number;

  /** Voto espresso dall'utente corrente su questa recensione. */
  userVote: 1 | -1 | 0;

  /** Dati dell'autore */
  user?: {
    username: string;
    iconId: number;
  } | null;

  createdAt: string;
}
