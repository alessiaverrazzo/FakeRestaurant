import { Injectable } from '@angular/core';
import { NotificationItem } from '../models/notification-item.model';

/**
 * ViewModel per il singolo elemento di notifica.
 * Gestisce la logica di visualizzazione, come la generazione del messaggio
 * e la determinazione delle classi CSS in base allo stato (letta/non letta, nuova).
 */
@Injectable()
export class NotificationItemViewModel {
  /** L'oggetto notifica da visualizzare. */
  notification!: NotificationItem;

  /**
   * Inizializza il ViewModel con i dati della notifica.
   * @param notification L'oggetto notifica.
   */
  init(notification: NotificationItem) {
    this.notification = notification;
  }

  /**
   * Restituisce il tipo di notifica per determinare l'icona da mostrare.
   */
  getIconType() {
    return this.notification?.type;
  }

  /**
   * Genera il messaggio testuale della notifica in base al tipo e all'attore.
   * @returns Una stringa descrittiva dell'azione avvenuta.
   */
  getMessage(): string {
    const user = this.notification.actorUsername ?? 'Qualcuno';

    switch (this.notification.type) {
      case 'upvote_review':
        return `${user} ha messo un upvote alla tua recensione`;
      case 'downvote_review':
        return `${user} ha messo un downvote alla tua recensione`;
      case 'upvote_restaurant':
        return `${user} ha messo un upvote al tuo ristorante`;
      case 'downvote_restaurant':
        return `${user} ha messo un downvote al tuo ristorante`;
      case 'new_review':
        return `${user} ha scritto una nuova recensione al tuo ristorante`;
      case 'reply':
        return `${user} ha risposto alla tua recensione`;
      default:
        return `${user} ha eseguito un'azione sul tuo account`;
    }
  }

  /**
   * Calcola le classi CSS per il contenitore della notifica.
   * Gestisce lo sfondo in base allo stato di lettura.
   */
  getContainerClasses(): Record<string, boolean> {
    return {
      'bg-white-background': this.notification.isRead,
      'bg-yellow-soft': !this.notification.isRead
    };
  }

  /**
   * Restituisce tutte le classi CSS necessarie, incluse quelle per le animazioni (live).
   */
  getAllClasses(): Record<string, boolean> {
    return {
      ...this.getContainerClasses(),
      'live-notification': this.notification.isNew === true
    };
  }
}
