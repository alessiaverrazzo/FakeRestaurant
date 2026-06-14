/**
 * DTO (Data Transfer Object) per l'esposizione dei dati di un voto assegnato a un ristorante.
 * Utilizzato per mostrare lo storico dei voti o il voto dell'utente corrente.
 */
export class VoteRestaurantDTO {
  id: number;
  /** ID dell'utente che ha espresso il voto */
  user_id: number;
  /** ID del ristorante votato */
  restaurant_id: number;
  /** Valore del voto: +1 (positivo) o -1 (negativo) */
  vote: number;
  created_at: Date;

  constructor(data: {
    id: number;
    user_id: number;
    restaurant_id: number;
    vote: number;
    created_at: Date;
  }) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.restaurant_id = data.restaurant_id;
    this.vote = data.vote;
    this.created_at = data.created_at;
  }
}

/**
 * DTO per la creazione di un nuovo voto per un ristorante.
 * Richiede l'ID del ristorante e il valore del voto (limitato a 1 o -1).
 */
export class CreateVoteRestaurantDTO {
  /** ID del ristorante da votare */
  restaurant_id: number;
  /** Il voto da assegnare: 1 (upvote) o -1 (downvote) */
  vote: 1 | -1;

  constructor(data: { restaurant_id: number; vote: 1 | -1 }) {
    this.restaurant_id = data.restaurant_id;
    this.vote = data.vote;
  }
}

/**
 * DTO per l'aggiornamento di un voto esistente.
 * Permette di cambiare il proprio voto (es. da positivo a negativo).
 */
export class UpdateVoteRestaurantDTO {
  id: number;
  /** Il nuovo valore del voto: 1 o -1 */
  vote: 1 | -1;
  
  constructor(data: { id: number; vote: 1 | -1 }) {
    this.id = data.id;
    this.vote = data.vote;
  }
}
