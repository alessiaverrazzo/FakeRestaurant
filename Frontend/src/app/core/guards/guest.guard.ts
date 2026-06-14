import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard per utenti non autenticati (Guest).
 * Impedisce l'accesso alle pagine di login/registrazione se l'utente è già loggato.
 * Se l'utente ha un token valido, viene reindirizzato alla home page.
 */
export const GuestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();

  // Se il token non è presente, l'utente è un ospite e può accedere.
  if (!token) {
    return true;
  }

  // Se il token è scaduto, effettua il logout e consenti l'accesso come ospite.
  if (auth.isTokenExpired(token)) {
    auth.logout();
    return true;
  }

  // Se il token è valido, l'utente è già autenticato: reindirizza alla home page.
  router.navigate(['/']);
  return false;
};
