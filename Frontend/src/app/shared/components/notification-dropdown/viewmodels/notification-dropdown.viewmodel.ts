import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppState } from '@core/state/app.state';
import { NotificationService } from '@core/services/notification.service';
import { Notification } from '@core/models/notification.model';


/**
 * ViewModel per il componente dropdown delle notifiche.
 * Gestisce la visualizzazione delle notifiche recenti, il conteggio non lette
 * e le azioni rapide (lettura, eliminazione, navigazione).
 */
@Injectable()
export class NotificationDropdownViewModel {

  private appState = inject(AppState);
  private notificationService = inject(NotificationService);

  readonly maxVisible = 10;
  isOpen = false;

  /** Signal per lo stato di caricamento. */
  loading = signal<boolean>(false);
  /** Signal per eventuali errori. */
  error = signal<string | null>(null);

  constructor() {}

  /**
   * Estrae un messaggio di errore leggibile dall'oggetto errore.
   */
  private extractMessage(err: any): string {
    return (
      err?.error?.message ||
      err?.message ||
      "Si è verificato un errore. Riprova più tardi."
    );
  }

  /** Signal computed che recupera le notifiche dallo stato globale. */
  notifications = computed(() =>
    this.appState.notifications()
  );

  /** Signal computed per le notifiche visibili nel dropdown (limitate a maxVisible). */
  visibleNotifications = computed(() =>
    this.notifications().slice(0, this.maxVisible)
  );

  /** Signal computed che indica se ci sono notifiche non lette. */
  hasUnread = computed(() =>
    this.appState.unreadCount() > 0
  );

  /** Signal computed con il conteggio delle notifiche non lette. */
  unreadCount = computed(() =>
    this.appState.unreadCount()
  );

  /** Signal computed per l'animazione della campanella. */
  bellAnimate = computed(() =>
    this.appState.bellAnimate()
  );

  /**
   * Apre o chiude il dropdown.
   * Se viene aperto, ricarica le notifiche recenti.
   */
  toggleDropdown() {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.loadRecent();
    }
  }

  /** Chiude il dropdown. */
  closeDropdown() {
    this.isOpen = false;
  }

  /**
   * Carica le notifiche recenti dal backend e aggiorna lo stato globale.
   */
  loadRecent() {
    this.loading.set(true);
    this.error.set(null);

    this.notificationService.getRecent().subscribe({
      next: list => {
        this.appState.setNotifications(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(this.extractMessage(err));
        this.loading.set(false);
      }
    });
  }

  /**
   * Gestisce il click su una notifica nel dropdown.
   * Chiude il dropdown, segna la notifica come letta e naviga alla destinazione.
   * @param n La notifica cliccata.
   * @param router Il router di Angular per la navigazione.
   */
  handleClick(n: Notification, router: Router) {
    this.closeDropdown();
    this.markAsRead(n.id);

    switch (n.type) {
      case 'upvote_restaurant':
      case 'downvote_restaurant':
        router.navigate(['/restaurants', n.targetId]);
        return;

      case 'upvote_review':
      case 'downvote_review':
        router.navigate(
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
        router.navigate(
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
        router.navigate(
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
   * Segna una singola notifica come letta.
   * Utilizza un approccio ottimistico con rollback in caso di errore.
   * @param id ID della notifica.
   */
  markAsRead(id: number) {
    if (!Number.isInteger(id) || id <= 0) return; // validazione minima
    const old = structuredClone(this.appState.notifications());

    this.appState.markNotificationAsRead(id);

    this.notificationService.markAsRead(id).subscribe({
      error: err => {
        this.appState.setNotifications(old);
        this.error.set(this.extractMessage(err));
      }
    });
  }

  /**
   * Elimina una notifica.
   * Utilizza un approccio ottimistico con rollback in caso di errore.
   * @param id ID della notifica.
   */
  deleteNotification(id: number) {
    if (!Number.isInteger(id) || id <= 0) return; // validazione minima

    const old = structuredClone(this.appState.notifications());

    this.appState.removeNotification(id);

    this.notificationService.delete(id).subscribe({
      error: err => {
        this.appState.setNotifications(old);
        this.error.set(this.extractMessage(err));
      }
    });
  }

  /**
   * Segna tutte le notifiche come lette.
   * Utilizza un approccio ottimistico con rollback in caso di errore.
   */
  markAllAsRead() {
    const old = structuredClone(this.appState.notifications());

    this.appState.markAllNotificationsAsRead();

    this.notificationService.markAllAsRead().subscribe({
      error: err => {
        this.appState.setNotifications(old);
        this.error.set(this.extractMessage(err));
      }
    });
  }
}
