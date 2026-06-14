import { Injectable } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { HttpService } from './http.service';
import { Review } from '../models/review.model';

/**
 * Servizio per la gestione delle Recensioni.
 * Permette di creare, leggere, aggiornare ed eliminare recensioni.
 * Gestisce anche i voti (upvote/downvote) e la struttura ad albero delle risposte.
 */
@Injectable({
  providedIn: 'root',
})
export class ReviewService {

  constructor(private http: HttpService) {}

  /**
   * Valida un ID assicurandosi che sia un numero finito e positivo.
   * @param id L'ID da verificare.
   * @throws Error se l'ID non è valido.
   */
  private validateId(id: any): number {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error('Invalid ID');
    }
    return n;
  }

  /**
   * Sanitizza il contenuto testuale di una recensione.
   * Rimuove tag HTML e limita la lunghezza.
   * @param text Il testo da pulire.
   * @param max Lunghezza massima (default 500).
   */
  private sanitizeContent(text: string, max = 500): string {
    if (!text) return '';
    let cleaned = text
      .trim()
      .replace(/[<>]/g, '')   // prevenzione XSS
      .slice(0, max);

    return cleaned;
  }

  /**
   * Valida il criterio di ordinamento delle recensioni.
   * @param order Criterio richiesto ('BEST', 'NEWEST', 'OLDEST').
   * @returns Il criterio validato o 'BEST' come fallback.
   */
  private validateOrder(order: string): 'BEST' | 'NEWEST' | 'OLDEST' {
    const allowed = ['BEST', 'NEWEST', 'OLDEST'];
    return allowed.includes(order) ? order as any : 'BEST';
  }

  /**
   * Recupera le recensioni di un ristorante specifico.
   * @param restaurantId ID del ristorante.
   * @param order Criterio di ordinamento.
   * @returns Observable della lista di recensioni.
   */
  getByRestaurantId(
    restaurantId: number,
    order: 'BEST' | 'NEWEST' | 'OLDEST' = 'BEST'
  ): Observable<Review[]> {

    const safeId = this.validateId(restaurantId);
    const safeOrder = this.validateOrder(order);

    return this.http
      .get<any[]>(`reviews/restaurant/${safeId}?order=${safeOrder}`)
      .pipe(map(list => list.map(r => this.safeMapReview(r))));
  }

  /**
   * Recupera una singola recensione tramite ID.
   * @param id ID della recensione.
   * @returns Observable con i dettagli della recensione.
   */
  getById(id: number): Observable<Review> {
    const safeId = this.validateId(id);

    return this.http
      .get<any>(`reviews/${safeId}`)
      .pipe(map(data => this.safeMapReview(data)));
  }

  /**
   * Crea una nuova recensione o una risposta a una recensione esistente.
   * @param payload Oggetto contenente ID ristorante, contenuto e ID recensione padre (opzionale).
   * @returns Observable della recensione creata.
   */
  create(payload: {
    restaurantId: number;
    content: string;
    parentReviewId?: number | null;
  }): Observable<Review> {

    const safeRestaurantId = this.validateId(payload.restaurantId);
    const safeParentId = payload.parentReviewId != null ? this.validateId(payload.parentReviewId) : null;
    const safeContent = this.sanitizeContent(payload.content);

    return this.http
      .post<any>('reviews', {
        restaurant_id: safeRestaurantId,
        content: safeContent,
        parent_review_id: safeParentId,
      })
      .pipe(map(data => this.safeMapReview(data)));
  }

  /**
   * Aggiorna il contenuto di una recensione esistente.
   * @param payload Oggetto contenente ID recensione e nuovo contenuto.
   * @returns Observable della recensione aggiornata.
   */
  update(payload: { id: number; content: string }): Observable<Review> {

    const safeId = this.validateId(payload.id);
    const safeContent = this.sanitizeContent(payload.content);

    return this.http
      .put<any>(`reviews/${safeId}`, {
        content: safeContent
      })
      .pipe(map(data => this.safeMapReview(data)));
  }

  /**
   * Elimina una recensione.
   * @param id ID della recensione da eliminare.
   */
  delete(id: number): Observable<void> {
    const safeId = this.validateId(id);
    return this.http.delete<void>(`reviews/${safeId}`);
  }

  /**
   * Recupera tutte le recensioni scritte dall'utente loggato.
   * @returns Observable della lista di recensioni dell'utente.
   */
  getMyReviews(): Observable<Review[]> {
    return this.http
      .get<any[]>('reviews/my-reviews')
      .pipe(map(list => list.map(r => this.safeMapReview(r))));
  }

  /**
   * Recupera le recensioni più popolari della settimana (Top Week).
   */
  getTop(): Observable<Review[]> {
    return this.http
      .get<any[]>('reviews/top')
      .pipe(map(list => list.map(r => this.safeMapReview(r))));
  }

  /**
   * Invia un voto per una recensione.
   * @param reviewId ID della recensione.
   * @param vote 1 (upvote) o -1 (downvote).
   * @returns Observable della recensione aggiornata.
   */
  voteReview(reviewId: number, vote: 1 | -1): Observable<Review> {
    const safeId = this.validateId(reviewId);

    return this.http
      .post<any>('votesReview', {
        review_id: safeId,
        vote,
      })
      .pipe(switchMap(() => this.getById(safeId)));
  }

  /**
   * Recupera il voto espresso dall'utente corrente su una recensione.
   * @param reviewId ID della recensione.
   * @returns 1 (upvote), -1 (downvote) o 0 (nessun voto).
   */
  getUserVote(reviewId: number): Observable<1 | -1 | 0> {
    const safeId = this.validateId(reviewId);

    return this.http.get<any>(`votesReview/user/${safeId}`).pipe(
      map(v => {
        if (!v || typeof v.vote !== 'number') return 0;
        return v.vote === 1 ? 1 : -1;
      })
    );
  }

  /**
   * Recupera il conteggio totale dei voti per una recensione.
   * @param reviewId ID della recensione.
   */
  getVotesCount(
    reviewId: number
  ): Observable<{ upvotes: number; downvotes: number }> {

    const safeId = this.validateId(reviewId);

    return this.http.get<any>(`review-vote/count/${safeId}`).pipe(
      map(res => ({
        upvotes: Number(res.upvotes ?? 0),
        downvotes: Number(res.downvotes ?? 0),
      }))
    );
  }

  /**
   * Mappa i dati grezzi del backend nel modello `Review`.
   * Gestisce la ricorsione per le risposte (replies) e sanitizza i contenuti.
   */
  private safeMapReview(data: any): Review {
    return {
      id: Number(data.id) || 0,
      userId: Number(data.user_id) || 0,
      restaurantId: Number(data.restaurant_id) || 0,

      content: this.sanitizeContent(data.content ?? '', 500),
      parentReviewId: data.parent_review_id ?? null,

      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null,

      upvotes: Number(data.upvotes ?? 0),
      downvotes: Number(data.downvotes ?? 0),

      userVote: typeof data.userVote === 'number' ? data.userVote : 0,

      user: data.user
        ? {
            username: String(data.user.username ?? ''),
            iconId: Number(data.user.icon_id ?? 0),
          }
        : null,

      replies: Array.isArray(data.replies)
        ? data.replies.map((r: any) => this.safeMapReview(r))
        : [],

      restaurantName: data.restaurant_name ?? null,
    };
  }
}
