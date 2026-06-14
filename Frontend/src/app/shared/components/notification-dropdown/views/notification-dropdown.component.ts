import { Component, HostListener, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';

import { NotificationDropdownViewModel } from '../viewmodels/notification-dropdown.viewmodel';
import { NotificationItemComponent } from '@features/notifications/notification-item/views/notification-item.component';
import { Notification } from '@core/models/notification.model';

/**
 * Componente per il dropdown delle notifiche nella navbar.
 * Gestisce l'apertura/chiusura, il click fuori (click outside) e la navigazione verso la pagina completa.
 */
@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [
    NotificationItemComponent
  ],
  providers: [NotificationDropdownViewModel],
  templateUrl: './notification-dropdown.component.html',
  styleUrl: './notification-dropdown.component.scss'
})
export class NotificationDropdownComponent {

  /** Evento emesso quando il dropdown viene aperto. */
  @Output() openDropdown = new EventEmitter<void>();

  public vm = inject(NotificationDropdownViewModel);

  private router = inject(Router);

  /**
   * Gestisce il click sul documento per chiudere il dropdown se si clicca fuori.
   * @param event L'evento di click nativo.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!(event.target as HTMLElement).closest('.notification-dropdown-container')) {
      this.vm.closeDropdown();
    }
  }

  /**
   * Gestisce il click su una singola notifica.
   * @param notification La notifica cliccata.
   */
  onNotificationClick(notification: Notification) {
    this.vm.handleClick(notification, this.router);
  }

  /**
   * Apre o chiude il dropdown e emette l'evento se aperto.
   */
  toggle() {
    this.vm.toggleDropdown();
    if (this.vm.isOpen) {
      this.openDropdown.emit();
    }
  }

  /**
   * Naviga alla pagina completa delle notifiche.
   * @param event L'evento di click (per fermare la propagazione).
   */
  goToNotifications(event: Event) {
    event.stopPropagation();
    this.vm.closeDropdown();
    this.router.navigate(['/notifications']);
  }
}
