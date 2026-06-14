import { Injectable } from '@angular/core';
import { Review } from '@core/models/review.model';
import { ReviewTreeModel } from '../models/review-tree.model';

/**
 * ViewModel (helper) per la gestione della struttura ad albero delle recensioni.
 * Si occupa di trasformare i dati delle recensioni (Review) nel modello specifico
 * per la visualizzazione ad albero (ReviewTreeModel), calcolando livelli e proprietà UI.
 */
@Injectable({ providedIn: 'root' })
export class ReviewTreeViewModel {

  /**
   * Costruisce ricorsivamente un nodo dell'albero delle recensioni.
   * Calcola la profondità del sottoalbero e inizializza lo stato UI (es. collapsed).
   * @param review La recensione da trasformare.
   * @param level Il livello di profondità corrente.
   * @returns Il nodo dell'albero trasformato.
   */
  private buildNode(review: Review, level: number): ReviewTreeModel {
    // Costruisci ricorsivamente i figli
    const replies = (review.replies ?? []).map(r => this.buildNode(r, level + 1));

    // Calcola il livello massimo del sottoalbero per layout o statistiche
    const maxSubtreeLevel =
      replies.length === 0
        ? level
        : Math.max(...replies.map(r => r.maxSubtreeLevel));

    return {
      id: review.id,
      userId: review.userId,
      restaurantId: review.restaurantId,
      parentReviewId: review.parentReviewId ?? null,
      content: review.content,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,

      upvotes: review.upvotes,
      downvotes: review.downvotes,

      user: review.user
        ? {
            username: review.user.username,
            iconId: review.user.iconId,
          }
        : null,

      restaurantName: review.restaurantName ?? null,
      userVote: review.userVote ?? 0,

      // struttura albero
      replies,
      maxSubtreeLevel,

      // UI
      level,
      collapsed: false,
      replyFormOpen: false,
      hasMoreChildren: replies.length > 0,
    };
  }

  /**
   * Appiattisce l'albero delle recensioni in una lista lineare (DFS).
   * Utile per operazioni che richiedono un'iterazione sequenziale o per il debug.
   * @param tree La lista di nodi radice.
   * @returns Una lista piatta di tutti i nodi.
   */
  flattenTree(tree: ReviewTreeModel[]): ReviewTreeModel[] {
    const list: ReviewTreeModel[] = [];

    const walk = (node: ReviewTreeModel) => {
      list.push(node);
      node.replies.forEach(walk);
    };

    tree.forEach(walk);
    return list;
  }

  /**
   * Costruisce l'albero completo delle recensioni a partire da una lista di recensioni radice.
   * @param reviews La lista di recensioni (che possono contenere replies nidificate).
   * @returns La lista di nodi radice trasformati in ReviewTreeModel.
   */
  buildTree(reviews: Review[]): ReviewTreeModel[] {
    return reviews.map(r => this.buildNode(r, 0));
  }
}
