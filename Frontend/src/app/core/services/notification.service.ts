import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpService } from './http.service';

import {
  Notification,
  NotificationType
} from '../models/notification.model';

/**
 * Servizio per la gestione delle notifiche.
 * Permette di recuperare, leggere ed eliminare le notifiche dell'utente.
 * Gestisce anche la mappatura dei dati dal formato backend al modello frontend.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  constructor(private http: HttpService) {}

  /**
   * Valida un ID numerico assicurandosi che sia un intero positivo.
   * @param id L'ID da verificare.
   * @throws Error se l'ID è nullo, indefinito o non valido.
   */
  private validateId(id: number): void {
    if (id === null || id === undefined) {
      throw new Error('ID non valido');
    }

    const parsed = Number(id);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error('ID non valido');
    }
  }

  /**
   * Recupera tutte le notifiche dell'utente loggato.
   * @returns Observable di una lista di notifiche mappate nel modello frontend.
   */
  getAll(): Observable<Notification[]> {
    return this.http
      .get<any[]>('notifications')
      .pipe(map(list => list.map(n => this.mapNotificationFromBackend(n))));
  }

  /**
   * Recupera le notifiche recenti (es. ultimi 7 giorni).
   * @returns Observable di una lista di notifiche recenti.
   */
  getRecent(): Observable<Notification[]> {
    return this.http
      .get<any[]>('notifications/recent')
      .pipe(map(list => list.map(n => this.mapNotificationFromBackend(n))));
  }

  /**
   * Segna una specifica notifica come letta.
   * @param id L'ID della notifica.
   * @returns Observable vuoto al completamento.
   * @throws Error se l'ID non è valido.
   */
  markAsRead(id: number): Observable<void> {
    try {
      this.validateId(id);
    } catch (err) {
      return throwError(() => err);
    }

    return this.http
      .put<{ message: string }>(`notifications/${id}/read`, {})
      .pipe(map(() => void 0));
  }

  /**
   * Segna tutte le notifiche dell'utente come lette.
   * @returns Observable vuoto al completamento.
   */
  markAllAsRead(): Observable<void> {
    return this.http
      .put<{ message: string }>('notifications/mark-all-read', {})
      .pipe(map(() => void 0));
  }

  /**
   * Elimina una notifica specifica.
   * @param id L'ID della notifica da eliminare.
   * @returns Observable vuoto al completamento.
   */
  delete(id: number): Observable<void> {
    try {
      this.validateId(id);
    } catch (err) {
      return throwError(() => err);
    }

    return this.http.delete<void>(`notifications/${id}`);
  }

  /**
   * Mappa il tipo di notifica grezzo del backend in un tipo specifico per la UI.
   * @param rawType Il tipo di azione (es. 'upvote').
   * @param rawTarget Il target dell'azione (es. 'restaurant').
   * @returns Il tipo di notifica frontend (es. 'upvote_restaurant').
   */
  private mapNotificationType(
    rawType: string,
    rawTarget: 'restaurant' | 'review'
  ): NotificationType {

    if (rawType === 'upvote') {
      return rawTarget === 'restaurant'
        ? 'upvote_restaurant'
        : 'upvote_review';
    }

    if (rawType === 'downvote') {
      return rawTarget === 'restaurant'
        ? 'downvote_restaurant'
        : 'downvote_review';
    }

    if (rawType === 'new_review') {
      return 'new_review';
    }

    return 'reply';
  }

  /**
   * Converte l'oggetto notifica grezzo ricevuto dal backend nel modello `Notification`.
   * Gestisce la normalizzazione delle date e dei tipi.
   * @param raw L'oggetto JSON grezzo.
   * @returns L'oggetto `Notification` pronto per l'uso.
   */
  public mapNotificationFromBackend(raw: any): Notification {
    const rawDate = raw.created_at;

    // Assicura che la data sia in formato ISO 8601 valido (aggiunge 'Z' se manca per UTC).
    const isoDate =
      typeof rawDate === 'string'
        ? (rawDate.endsWith('Z') ? rawDate : rawDate + 'Z')
        : new Date(rawDate).toISOString();

    return {
      id: raw.id,
      userId: raw.user_id,
      actorId: raw.actor_id,
      targetType: raw.target_type,
      targetId: raw.target_id,
      reviewId: raw.review_id ?? null,
      replyId: raw.reply_id ?? null,
      restaurantId: raw.restaurant_id ?? null,
      isRead: raw.is_read,
      createdAt: isoDate,
      type: this.mapNotificationType(raw.type, raw.target_type),
      actorUsername: raw.actor_username ?? undefined
    };
  }
}
