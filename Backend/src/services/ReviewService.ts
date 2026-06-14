import ReviewRepository from '../repositories/ReviewRepository';
import RestaurantService from './RestaurantService';
import { Review } from '../models/Review';
import { AppError } from '../utils/AppError';

/**
 * Service per la gestione della logica di business relativa alle recensioni.
 * Gestisce CRUD, sanitizzazione dei contenuti, calcolo dei punteggi (Wilson Score)
 * e costruzione della struttura ad albero per le risposte (threading).
 */
class ReviewService {

  /**
   * Crea una nuova recensione.
   * Effettua la sanitizzazione del contenuto per prevenire XSS.
   * @param review L'istanza della recensione da creare.
   */
  async create(review: Review): Promise<Review> {

    if (!review.content || review.content.trim().length === 0) {
      throw new AppError("Content cannot be empty", 400);
    }

    // Sanitizzazione XSS / HTML / script injection
    review.content = review.content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 4000);

    return await ReviewRepository.create(review);
  }

  /**
   * Recupera una recensione per ID, includendo i voti.
   * @param id ID della recensione.
   */
  async getById(id: number): Promise<Review | null> {
    return await ReviewRepository.findByIdWithVotes(id);
  }

  /**
   * Recupera tutte le recensioni scritte da un utente.
   * @param userId ID dell'utente.
   */
  async getByUserId(userId: number): Promise<Review[]> {
    return await ReviewRepository.findByUserId(userId);
  }

  /**
   * Recupera l'albero delle recensioni per un ristorante.
   * Restituisce le recensioni principali con le relative risposte annidate.
   * @param restaurantId ID del ristorante.
   * @param order Criterio di ordinamento (BEST, NEWEST, OLDEST).
   */
  async getTreeByRestaurantId(
    restaurantId: number,
    order: 'BEST' | 'NEWEST' | 'OLDEST' = 'BEST'
  ) {
    return await this.getTopLevelTreeByRestaurantId(restaurantId, order);
  }

  /**
   * Recupera una singola recensione (e le sue risposte) come struttura ad albero.
   * Utile per visualizzare un singolo thread di discussione.
   * @param reviewId ID della recensione.
   */
  async getTreeById(reviewId: number): Promise<any | null> {
    const review = await ReviewRepository.findByIdWithVotes(reviewId);
    if (!review) return null;

    const tree = await this.getTreeByRestaurantId(review.restaurant_id);

    const findNode = (nodes: any[], id: number): any | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.replies, id);
        if (found) return found;
      }
      return null;
    };

    return findNode(tree, reviewId);
  }

  /**
   * Aggiorna il contenuto di una recensione.
   * Verifica che l'utente sia l'autore e sanitizza il nuovo contenuto.
   * @param data Oggetto con ID recensione, nuovo contenuto e ID utente richiedente.
   */
  async update(data: { id: number; content: string; userId: number }): Promise<Review> {
    const review = await ReviewRepository.findByIdWithVotes(data.id);
    if (!review) throw new AppError("Recensione non trovata", 404);

    // Owner check
    if (review.user_id !== data.userId) {
      throw new AppError("Non autorizzato", 403);
    }

    if (!data.content || data.content.trim().length === 0) {
      throw new AppError("Il contenuto della recensione non può essere vuoto", 400);
    }

    // Sanitizzazione (doppia: defense in depth)
    review.content = data.content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 4000);

    const updated = await ReviewRepository.update(review);
    return updated!;
  }

  /**
   * Elimina una recensione.
   * Verifica che l'utente sia l'autore prima di procedere.
   * @param data Oggetto con ID recensione e ID utente richiedente.
   */
  async delete(data: { reviewId: number; userId: number }): Promise<void> {
    const review = await ReviewRepository.findByIdWithVotes(data.reviewId);
    if (!review) throw new AppError("Recensione non trovata", 404);

    if (review.user_id !== data.userId) {
      throw new AppError("Non autorizzato", 403);
    }

    const deleted = await ReviewRepository.delete(data.reviewId, data.userId);
    if (!deleted) throw new AppError("Errore durante la cancellazione della recensione", 500);
  }

  /**
   * Calcola il Wilson Score Interval.
   * Utilizzato per ordinare le recensioni bilanciando voti positivi e numero totale di voti.
   * @param upvotes Voti positivi.
   * @param downvotes Voti negativi.
   * @param z Livello di confidenza (default 1.96 per 95%).
   */
  wilsonScore(upvotes: number, downvotes: number, z = 1.96): number {
    const n = upvotes + downvotes;
    if (n === 0) return 0;
    const p = upvotes / n;
    return (
      (p + (z * z) / (2 * n) -
        z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
      (1 + (z * z) / n)
    );
  }

  /**
   * Recupera le 5 recensioni migliori di tutti i tempi.
   * Calcola il Wilson Score per ciascuna recensione e ordina in ordine decrescente.
   * @returns Array delle prime 5 recensioni ordinate per punteggio Wilson.
   */
  async getTopAllTime() {
    const reviews = await ReviewRepository.findAllWithVotesBasic();

    const scored = reviews.map(r => ({
      ...r,
      wilson_score: this.wilsonScore(Number(r.upvotes), Number(r.downvotes)),
    }));

    // Ordina per Wilson score e prendi le prime 5
    const top5 = scored
      .sort((a, b) => b.wilson_score - a.wilson_score)
      .slice(0, 5);

    return top5;
  }

  /**
   * Recupera le recensioni di primo livello (senza genitore) per un ristorante,
   * costruendo per ciascuna l'albero delle risposte.
   * @param restaurantId ID del ristorante.
   * @param order Ordinamento desiderato.
   */
  async getTopLevelTreeByRestaurantId(
    restaurantId: number,
    order: 'BEST' | 'NEWEST' | 'OLDEST' = 'BEST'
  ): Promise<any[]> {

    // Ristorante non trovato
    if (await RestaurantService.getById(restaurantId) == null)
      throw new AppError('Ristorante non trovato', 404);

    // Validazione ordine (contro injection)
    const validOrders = ["BEST", "NEWEST", "OLDEST"];
    if (!validOrders.includes(order)) order = "BEST";

    const topLevelReviews = await ReviewRepository.findTopLevelByRestaurantId(restaurantId);
    const allReviews = await ReviewRepository.findByRestaurantIdWithVotes(restaurantId);

    const tree = await this.buildReviewTree(allReviews);

    const firstLevelTree = topLevelReviews.map(r => {
      const node = tree.find(n => n.id === r.id);
      return node ?? { ...r, replies: [] };
    });

    switch (order) {
      case 'NEWEST':
        firstLevelTree.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'OLDEST':
        firstLevelTree.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'BEST':
      default:
        firstLevelTree.sort((a, b) => {
          const scoreA = (a.upvotes ?? 0) - (a.downvotes ?? 0);
          const scoreB = (b.upvotes ?? 0) - (b.downvotes ?? 0);
          return scoreB - scoreA;
        });
        break;
    }

    return firstLevelTree;
  }

  /**
   * Costruisce ricorsivamente l'albero delle recensioni partendo da una lista piatta.
   * Associa le risposte ai rispettivi genitori.
   * @param reviews Array piatto di recensioni.
   */
  async buildReviewTree(reviews: any[]): Promise<any[]> {
    if (!reviews || reviews.length === 0) return [];

    const plainReviews = reviews.map((r: any) => ({
      id: Number(r.id),
      content: r.content,
      user_id: r.user_id,
      user: r.username ? { username: r.username, icon_id: r.icon_id } : null,
      restaurant_id: r.restaurant_id,
      parent_review_id: r.parent_review_id !== null ? Number(r.parent_review_id) : null,
      created_at: new Date(r.created_at),
      upvotes: r.upvotes ?? 0,
      downvotes: r.downvotes ?? 0,
      replies: []
    }));

    const idMap: Record<number, any> = {};
    plainReviews.forEach(r => { idMap[r.id] = r; });

    plainReviews.forEach(r => {
      if (r.parent_review_id && idMap[r.parent_review_id]) {
        idMap[r.parent_review_id].replies.push(r);
      }
    });

    const roots = plainReviews.filter(r => r.parent_review_id === null);

    const sortReplies = (nodes: any[]) => {
      nodes.forEach((n: any) => {
        if (n.replies.length > 0) {
          n.replies.sort((a: any, b: any) => a.created_at.getTime() - b.created_at.getTime());
          sortReplies(n.replies);
        }
      });
    };

    sortReplies(roots);

    return roots;
  }
}

export default new ReviewService();
