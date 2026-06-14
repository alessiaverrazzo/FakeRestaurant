import { Injectable, computed, signal, inject } from '@angular/core';
import { AppState } from '@core/state/app.state';

/**
 * ViewModel per il componente Navbar.
 * Gestisce lo stato di visualizzazione della barra di navigazione (menu mobile, login, notifiche).
 * Espone uno stato reattivo combinato per il template.
 */
@Injectable({ providedIn: 'root' })
export class NavbarViewModel {

  private appState = inject(AppState);

  /** Signal privato per lo stato di apertura del menu mobile. */
  private menuOpenSignal = signal(false);

  /** Signal computed che indica se l'utente è loggato. */
  readonly isLoggedIn = computed(() =>
    this.appState.isLoggedIn()
  );

  /** Signal computed che indica se ci sono notifiche non lette. */
  readonly hasNotifications = computed(() =>
    this.appState.unreadCount() > 0
  );

  /**
   * Signal computed che aggrega lo stato rilevante per la navbar.
   * Utile per passare un singolo oggetto al template o per debugging.
   */
  readonly state = computed(() => ({
    isLoggedIn: this.isLoggedIn(),
    hasNotifications: this.hasNotifications(),
    menuOpen: this.menuOpenSignal()
  }));

  /**
   * Inverte lo stato di apertura del menu mobile (toggle).
   */
  toggleMenu() {
    this.menuOpenSignal.update(v => !v);
  }

  /**
   * Chiude il menu mobile.
   */
  closeMenu() {
    this.menuOpenSignal.set(false);
  }

  /**
   * Gestisce la chiusura del menu in fase di logout.
   */
  logout() {
    this.menuOpenSignal.set(false);
  }
}
