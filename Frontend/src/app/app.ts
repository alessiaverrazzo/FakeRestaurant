import { Component, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

import { NavbarComponent } from './shared/layouts/navbar/views/navbar.component';
import { LoginComponent } from './features/auth/login/views/login.component';
import { RegisterComponent } from './features/auth/register/views/register.component';
import { PasswordResetRequestComponent } from './features/auth/password-reset-request/views/password-reset-request.component';

/**
 * Componente principale dell'applicazione (Root Component).
 * Gestisce il layout di base, la navbar e i modali globali di autenticazione (login, register, reset password).
 * Intercetta eventi di navigazione per aprire automaticamente il login se richiesto dallo stato della rotta.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    NavbarComponent,
    LoginComponent,
    RegisterComponent,
    PasswordResetRequestComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {

  /** Flag per mostrare il modale di login. */
  showLogin = false;
  /** Flag per mostrare il modale di registrazione. */
  showRegister = false;
  /** Flag per mostrare il modale di richiesta reset password. */
  showPasswordResetRequest = false;

  private router: Router;

  /**
   * Inizializza il componente e sottoscrive agli eventi di navigazione.
   * Se una navigazione termina con lo stato `openLogin: true`, apre il modale di login.
   * @param router Il router di Angular (iniettato opzionalmente per testabilità).
   */
  constructor(router?: Router) {
    this.router = router ?? inject(Router);

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const state = this.router.currentNavigation()?.extras.state as
          | { openLogin?: boolean }
          | undefined;

        if (state?.openLogin) {
          this.openLogin();
        }
      });
  }

  /** Apre il modale di login chiudendo gli altri. */
  openLogin() {
    this.closeAll();
    this.showLogin = true;
  }

  /** Apre il modale di registrazione chiudendo gli altri. */
  openRegister() {
    this.closeAll();
    this.showRegister = true;
  }

  /** Apre il modale di richiesta reset password chiudendo gli altri. */
  openPasswordResetRequest() {
    this.closeAll();
    this.showPasswordResetRequest = true;
  }

  /** Chiude il modale di login. */
  closeLogin() {
    this.showLogin = false;
  }

  /** Chiude il modale di registrazione. */
  closeRegister() {
    this.showRegister = false;
  }

  /** Chiude il modale di richiesta reset password. */
  closePasswordResetRequest() {
    this.showPasswordResetRequest = false;
  }

  /** Chiude tutti i modali di autenticazione aperti. */
  private closeAll() {
    this.showLogin = false;
    this.showRegister = false;
    this.showPasswordResetRequest = false;
  }
}
