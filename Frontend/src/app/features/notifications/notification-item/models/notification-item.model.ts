import { Notification } from '@core/models/notification.model';

/**
 * Modello esteso per l'elemento di notifica nella lista UI.
 * Eredita da Notification e aggiunge proprietà specifiche per la visualizzazione.
 */
export interface NotificationItem extends Notification {
  /** Flag opzionale per indicare visivamente se la notifica è stata appena ricevuta. */
  isNew?: boolean;
}
