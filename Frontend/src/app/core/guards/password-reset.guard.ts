import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { HttpService } from '../services/http.service';
import { catchError, map, of } from 'rxjs';

/**
 * Guard per la verifica del token di reset password.
 * Controlla se il token è presente nei parametri della rotta e ne verifica la validità tramite backend.
 * Se il token è mancante o non valido, reindirizza alla home page con un parametro di errore.
 */
export const PasswordResetGuard: CanActivateFn = (route) => {
  const http = inject(HttpService);
  const router = inject(Router);

  const token = route.params['token'];

  // Verifica se il token è presente nei parametri della rotta.
  // Se manca, reindirizza alla home page segnalando l'errore.
  if (!token) {
    return router.parseUrl('/?invalidResetToken=1');
  }

  // Verifica la validità del token chiamando l'endpoint dedicato del backend.
  return http.get(`users/password-reset/verify/${token}`).pipe(
    // Se la chiamata ha successo, il token è valido: consenti l'accesso alla rotta.
    map(() => true),
    catchError(() =>
      // Se la chiamata fallisce (es. 404 o 400), il token non è valido:
      // reindirizza alla home page segnalando l'errore.
      of(router.parseUrl('/?invalidResetToken=1'))
    )
  );
};
