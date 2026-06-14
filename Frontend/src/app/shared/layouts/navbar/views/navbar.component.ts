import { Component, HostListener, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { NavbarViewModel } from '../viewmodels/navbar.viewmodel';
import { NotificationDropdownComponent } from '../../../components/notification-dropdown/views/notification-dropdown.component';

import { AddRestaurantModalComponent } from '@features/restaurants/add-restaurant-modal/views/add-restaurant-modal.component';
import { CreatedRestaurantEvent } from '@features/restaurants/add-restaurant-modal/models/add-restaurant.model';

import { AuthService } from '@core/services/auth.service';

/**
 * Componente per la Navbar dell'applicazione.
 * Gestisce la navigazione principale, il menu mobile, le notifiche e l'accesso alle funzionalità utente.
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NotificationDropdownComponent,
    AddRestaurantModalComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {

  /** Evento emesso quando l'utente clicca su "Accedi". */
  @Output() login = new EventEmitter<void>();

  /** Flag per aggiungere un'ombra alla navbar durante lo scroll. */
  hasShadow = false;
  /** Flag per mostrare/nascondere il modale di aggiunta ristorante. */
  showAddRestaurantModal = false;

  public vm = inject(NavbarViewModel);

  private router = inject(Router);
  private authService = inject(AuthService);

  /**
   * Gestisce l'evento di scroll della finestra.
   * Aggiunge l'ombra alla navbar se la pagina è stata scorseggiata.
   */
  @HostListener('window:scroll')
  onScroll() {
    this.hasShadow = window.scrollY > 5;
  }

  /**
   * Gestisce il click sul documento per chiudere il menu mobile se si clicca fuori.
   * @param event L'evento di click nativo.
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!(event.target instanceof HTMLElement)) return;

    const target = event.target;
    const clickedInsideMenu = target.closest('.mobile-menu');
    const clickedHamburger = target.closest('.hamburger-btn');
    const clickedNotifications = target.closest('app-notification-dropdown');

    if (clickedInsideMenu || clickedHamburger || clickedNotifications) return;

    this.vm.closeMenu();
  }

  /**
   * Apre il modale di login ed emette l'evento corrispondente.
   * Chiude il menu mobile se aperto.
   */
  openLogin() {
    this.login.emit();
    this.vm.closeMenu();
  }

  /**
   * Effettua il logout dell'utente.
   * Chiude la sessione, resetta lo stato e reindirizza alla home page.
   */
  onLogout(): void {
    this.authService.logout();
    this.vm.logout();
    this.vm.closeMenu();
    this.router.navigate(['/']);
  }

  /**
   * Gestisce l'evento di creazione di un nuovo ristorante.
   * Naviga alla pagina di dettaglio del ristorante appena creato.
   * @param event L'evento contenente l'ID del nuovo ristorante.
   */
  onCreateRestaurant(event: CreatedRestaurantEvent) {
    this.router.navigate(['/restaurants', event.createdRestaurantId]);
  }
}
