/**
 * DTO (Data Transfer Object) per l'esposizione dei dati di un voto assegnato a una recensione.
 * Utilizzato per mostrare lo storico dei voti o il voto dell'utente corrente.
 */
export class VoteReviewDTO {
  id: number;
  /** ID dell'utente che ha espresso il voto */
  user_id: number;
  /** ID della recensione votata */
  review_id: number;
  /** Valore del voto: +1 (positivo) o -1 (negativo) */
  vote: number;
  created_at: Date;

  constructor(data: {
    id: number;
    user_id: number;
    review_id: number;
    vote: number;
    created_at: Date;
  }) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.review_id = data.review_id;
    this.vote = data.vote;
    this.created_at = data.created_at;
  }
}

/**
 * DTO per la creazione di un nuovo voto per una recensione.
 * Richiede l'ID della recensione e il valore del voto (limitato a 1 o -1).
 */
export class CreateVoteReviewDTO {
  /** ID della recensione da votare */
  review_id: number;
  /** Il voto da assegnare: 1 (upvote) o -1 (downvote) */
  vote: 1 | -1;

  constructor(data: { review_id: number; vote: 1 | -1 }) {
    this.review_id = data.review_id;
    this.vote = data.vote;
  }
}

/**
 * DTO per l'aggiornamento di un voto esistente.
 * Permette di cambiare il proprio voto (es. da positivo a negativo).
 */
export class UpdateVoteReviewDTO {
  id: number;
  /** Il nuovo valore del voto: 1 o -1 */
  vote: 1 | -1;
  
  constructor(data: { id: number; vote: 1 | -1 }) {
    this.id = data.id;
    this.vote = data.vote;
  }
}
