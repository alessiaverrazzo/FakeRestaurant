import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor HTTP per la gestione dell'autenticazione.
 * Aggiunge il token JWT all'header Authorization per le richieste verso endpoint protetti.
 * Gestisce anche il logout automatico in caso di token scaduto.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private auth: AuthService) {}

  /**
   * Intercetta le richieste HTTP in uscita.
   * @param req La richiesta HTTP originale.
   * @param next Il gestore per la prossima fase della catena di intercettazione.
   * @returns Un Observable dell'evento HTTP.
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const token = this.auth.getToken();

    // Determina il percorso della richiesta in modo sicuro.
    // Utilizza window.location.origin come base per gestire URL relativi ed evitare errori.
    let path: string;
    try {
      path = new URL(req.url, window.location.origin).pathname.toLowerCase();
    } catch {
      // Fallback: se la creazione dell'URL fallisce, usa l'URL della richiesta così com'è.
      path = req.url.toLowerCase();
    }

    // Se la rotta è pubblica (es. login, register), non aggiungere il token.
    if (this.isPublicRoute(path)) {
      return next.handle(req);
    }

    // Se non c'è un token salvato, inoltra la richiesta senza modifiche.
    if (!token) {
      return next.handle(req);
    }

    // Se il token è presente ma scaduto, effettua il logout automatico.
    if (this.auth.isTokenExpired(token)) {
      this.auth.logout();
      return next.handle(req);
    }

    // Clona la richiesta aggiungendo l'header Authorization con il token Bearer.
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next.handle(cloned);
  }

  /**
   * Verifica se un percorso corrisponde a una rotta pubblica che non richiede autenticazione.
   * @param path Il percorso della richiesta.
   * @returns true se la rotta è pubblica, false altrimenti.
   */
  private isPublicRoute(path: string): boolean {
    return (
      path === '/api/users/login' ||
      path === '/api/users/register' ||
      path === '/api/users/password-reset' ||
      path.startsWith('/api/users/password-reset/verify/') ||
      path === '/api/users/password-reset/reset'
    );
  }
}
