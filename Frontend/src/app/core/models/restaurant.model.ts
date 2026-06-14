/**
 * Modello dati per un Ristorante.
 * Rappresenta le informazioni principali di un ristorante, incluse le coordinate geografiche,
 * i dettagli del proprietario e lo stato dei voti.
 */
export interface Restaurant {
  id: number;
  userId: number;
  name: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;

  upvotes: number;
  downvotes: number;

  /** Username del proprietario */
  username?: string | null;
  /** ID dell'icona del proprietario */
  iconId?: number | null;

  /**
   * Voto espresso dall'utente loggato su questo ristorante.
   * 1 = upvote, -1 = downvote, 0 = nessun voto.
   */
  userVote?: 1 | -1 | 0;
}
