import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { NotificationItem } from '../models/notification-item.model';
import { NotificationItemViewModel } from '../viewmodels/notification-item.viewmodel';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';

/**
 * Componente per la visualizzazione di una singola notifica nella lista.
 * Gestisce gli eventi di click, eliminazione e marcatura come letta.
 * Utilizza un ViewModel dedicato per la logica di presentazione.
 */
@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [
    CommonModule,
    TimeAgoPipe
  ],
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss'],
  providers: [NotificationItemViewModel]
})
export class NotificationItemComponent {
  constructor(public vm: NotificationItemViewModel) {}

  /**
   * Imposta i dati della notifica da visualizzare.
   * Inizializza il ViewModel con i nuovi dati.
   */
  @Input() set notification(value: NotificationItem) {
    this.vm.init(value);
  }

  /** Evento emesso quando l'utente richiede l'eliminazione della notifica. */
  @Output() delete = new EventEmitter<number>();

  /** Evento emesso quando la notifica viene segnata come letta. */
  @Output() markAsRead = new EventEmitter<number>();

  /** Evento emesso al click sulla notifica per la navigazione. */
  @Output() clicked = new EventEmitter<NotificationItem>();

  /**
   * Gestisce il click sull'intero elemento della notifica.
   * Emette l'evento `clicked` con i dati della notifica.
   */
  onClick() {
    this.clicked.emit(this.vm.notification);
  }

  /**
   * Gestisce il click sul pulsante di eliminazione.
   * Ferma la propagazione dell'evento per evitare di attivare `onClick` ed emette l'evento `delete`.
   * @param event L'evento MouseEvent originale.
   */
  onDelete(event: MouseEvent) {
    event.stopPropagation();
    this.delete.emit(this.vm.notification.id);
  }
}
