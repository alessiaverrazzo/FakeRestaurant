/**
 * DTO (Data Transfer Object) per l'esposizione dei dati di una recensione.
 * Include informazioni sull'autore, i voti e la struttura gerarchica delle risposte (replies).
 */
export class ReviewDTO {
  id: number;
  /** ID dell'utente autore della recensione */
  user_id: number;
  /** ID del ristorante recensito */
  restaurant_id: number;
  /** Contenuto testuale della recensione */
  content: string;
  /** ID della recensione genitore (se questa è una risposta) */
  parent_review_id?: number | null;
  created_at: Date;
  updated_at: Date;
  
  /** Numero di voti positivi ricevuti */
  upvotes?: number;
  /** Numero di voti negativi ricevuti */
  downvotes?: number;
  /** Array ricorsivo contenente le risposte a questa recensione */
  replies: ReviewDTO[] = [];

  /** Nome del ristorante (opzionale, utile per visualizzazione lato frontend) */
  restaurant_name?: string | null;

  /** Dati essenziali dell'autore per la visualizzazione */
  user?: {
    username: string;
    icon_id: number;
  } | null;

  constructor(data: {
    id: number;
    user_id: number;
    restaurant_id: number;
    content: string;
    parent_review_id?: number | null;
    created_at: Date;
    updated_at: Date;
    upvotes?: number;
    downvotes?: number;
    replies?: any[];
    restaurant_name?: string | null;

    user?: {
      username: string;
      icon_id: number;
    } | null;
  }) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.restaurant_id = data.restaurant_id;
    this.content = data.content;
    this.parent_review_id = data.parent_review_id ?? null;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.upvotes = data.upvotes;
    this.downvotes = data.downvotes;

    // Trasforma sempre le replies ricorsivamente in ReviewDTO
    this.replies = (data.replies || []).map((r: any) => new ReviewDTO(r));

    this.restaurant_name = data.restaurant_name ?? null;

    this.user = data.user
      ? {
          username: data.user.username,
          icon_id: data.user.icon_id,
        }
      : null;
  }
}

/**
 * DTO per la creazione di una nuova recensione o risposta.
 */
export class CreateReviewDTO {
  /** ID del ristorante a cui si riferisce la recensione */
  restaurant_id: number;
  /** Testo della recensione */
  content: string;
  /** ID della recensione a cui si sta rispondendo (opzionale) */
  parent_review_id?: number | null;

  constructor(data: {
    restaurant_id: number;
    content: string;
    parent_review_id?: number | null;
  }) {
    this.restaurant_id = data.restaurant_id;
    this.content = data.content;
    this.parent_review_id = data.parent_review_id ?? null;
  }
}

/**
 * DTO per l'aggiornamento del contenuto di una recensione esistente.
 */
export class UpdateReviewDTO {
  id: number;
  /** Nuovo contenuto testuale */
  content: string;

  constructor(data: { id: number; content: string }) {
    this.id = data.id;
    this.content = data.content;
  }
}
