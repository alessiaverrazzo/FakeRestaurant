import { Injectable, inject, signal, computed } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { Router } from '@angular/router';

import { AppState } from '@core/state/app.state';
import { Notification } from '@core/models/notification.model';
import { NotificationService } from '@core/services/notification.service';

/**
 * ViewModel per la pagina delle Notifiche.
 * Gestisce il caricamento, la paginazione (infinite scroll), il raggruppamento per data
 * e le azioni sulle notifiche (lettura, eliminazione, navigazione).
 */
@Injectable()
export class NotificationPageViewModel {

  private notificationService = inject(NotificationService);
  private appState = inject(AppState);
  private router = inject(Router);

  /** Dimensione del batch per l'infinite scroll. */
  private batchSize = 10;
  /** Numero di notifiche attualmente caricate nella vista. */
  private loaded = 10;

  /** Signal per lo stato di caricamento. */
  loading = signal(false);
  /** Signal per il messaggio di errore. */
  errorMessage = signal<string | null>(null);

  /** Signal computed che recupera tutte le notifiche dallo stato globale. */
  private allNotifications = computed<Notification[]>(() =>
    this.appState.notifications()
  );

  /** Signal computed per la lista di notifiche visibili, limitata per l'infinite scroll. */
  visibleNotifications = computed<Notification[]>(() =>
    this.allNotifications().slice(0, this.loaded)
  );

  /**
   * Gestisce il click su una notifica.
   * Marca la notifica come letta e naviga verso la risorsa correlata (ristorante o recensione).
   * @param n La notifica cliccata.
   */
  handleClick(n: Notification) {
    this.markAsRead(n.id);

    switch (n.type) {
      case 'upvote_restaurant':
      case 'downvote_restaurant':
        this.router.navigate(['/restaurants', n.targetId]);
        return;

      case 'upvote_review':
      case 'downvote_review':
        this.router.navigate(
          ['/restaurants', n.restaurantId],
          {
            queryParams: {
              highlightRootReviewId: n.targetId,
              highlightReviewId: n.targetId
            }
          }
        );
        return;

      case 'reply':
        this.router.navigate(
          ['/restaurants', n.restaurantId],
          {
            queryParams: {
              highlightRootReviewId: n.reviewId ?? n.targetId,
              highlightReviewId: n.targetId
            }
          }
        );
        return;

      case 'new_review':
        this.router.navigate(
          ['/restaurants', n.restaurantId],
          {
            queryParams: {
              highlightRootReviewId: n.targetId,
              highlightReviewId: n.targetId
            }
          }
        );
        return;

      default:
        return;
    }
  }

  /**
   * Carica le notifiche dal backend all'avvio della pagina.
   * Calcola il flag `isNew` per le notifiche recenti (< 1 min) e aggiorna lo stato globale.
   */
  async loadFromBackend() {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      // Otteniamo Notification[] già mappate
      const list = await lastValueFrom(this.notificationService.getAll());

      const now = Date.now();

      // Aggiungiamo isNew alle notifiche appena caricate
      const mapped = list.map(n => {
        const created = new Date(n.createdAt).getTime();
        const isNew = now - created < 60_000;

        return {
          ...n,
          isNew
        };
      });

      // Salviamo nello stato globale
      this.appState.setNotifications(mapped);

    } catch (err: any) {

      const backendMessage =
        err?.error?.message ||
        err?.message ||
        "Impossibile caricare le notifiche.";

      this.errorMessage.set(backendMessage);

    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Carica ulteriori notifiche (Infinite Scroll).
   */
  loadMore() {
    if (this.loading()) return;

    this.loading.set(true);

    setTimeout(() => {
      this.loaded += this.batchSize;
      this.loading.set(false);
    }, 300);
  }

  /**
   * Segna una singola notifica come letta.
   * Aggiorna sia il backend che lo stato locale.
   * @param id ID della notifica.
   */
  async markAsRead(id: number) {
    try {
      await lastValueFrom(this.notificationService.markAsRead(id));
      this.appState.markNotificationAsRead(id);

    } catch (err: any) {
      console.warn("Errore markAsRead:",
        err?.error?.message || err?.message || "Si è verificato un errore."
      );
    }
  }

  /**
   * Segna tutte le notifiche come lette.
   */
  async markAllAsRead() {
    try {
      await lastValueFrom(this.notificationService.markAllAsRead());
      this.appState.markAllNotificationsAsRead();

    } catch (err: any) {
      console.warn("Errore markAllAsRead:",
        err?.error?.message || err?.message || "Si è verificato un errore."
      );
    }
  }

  /**
   * Elimina una notifica.
   * @param id ID della notifica da eliminare.
   */
  async deleteNotification(id: number) {
    try {
      await lastValueFrom(this.notificationService.delete(id));
      this.appState.removeNotification(id);

    } catch (err: any) {
      const backendMessage =
        err?.error?.message ||
        err?.message ||
        "Errore durante l'eliminazione della notifica.";

      console.warn("Errore deleteNotification:", backendMessage);
    }
  }

  /**
   * Raggruppa le notifiche visibili per data (Oggi, Ieri, Questa settimana, ecc.).
   * @returns Un oggetto con le chiavi temporali e le liste di notifiche.
   */
  groupedNotifications() {
    return this.groupByDate(this.visibleNotifications());
  }

  /**
   * Logica interna di raggruppamento per data.
   */
  private groupByDate(items: Notification[]) {
    const groups: Record<string, Notification[]> = {};

    const now = new Date();
    const today = now.toDateString();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = yesterdayDate.toDateString();

    for (const notif of items) {
      const created = new Date(notif.createdAt).toDateString();
      let key = '';

      if (created === today) key = 'Oggi';
      else if (created === yesterday) key = 'Ieri';
      else {
        const diffDays = Math.floor(
          (now.getTime() - new Date(notif.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 7) key = 'Questa settimana';
        else if (diffDays <= 30) key = 'Questo mese';
        else key = 'Più vecchie';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(notif);
    }

    return groups;
  }
}
