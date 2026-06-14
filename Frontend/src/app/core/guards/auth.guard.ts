import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard di autenticazione che verifica se l'utente possiede un token valido.
 * Se il token manca o è scaduto, l'utente viene reindirizzato alla pagina di accesso negato.
 */
export const AuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();

  // Verifica se il token è presente. Se non c'è, l'utente non è loggato.
  if (!token) {
    return router.parseUrl('/access-denied');
  }

  // Verifica se il token è scaduto. Se lo è, effettua il logout e reindirizza.
  if (auth.isTokenExpired(token)) {
    auth.logout();
    return router.parseUrl('/access-denied');
  }

  // Se il token è presente e valido, consenti l'accesso alla rotta.
  return true;
};
