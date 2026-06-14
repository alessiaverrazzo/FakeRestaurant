import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor per la gestione globale degli errori HTTP.
 * Intercetta le risposte di errore dal backend e le trasforma in messaggi utente comprensibili.
 * Gestisce casi specifici come errori di rete, sessioni scadute (401) e altri codici di stato standard.
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(private auth: AuthService) {}

  /**
   * Intercetta le richieste e gestisce gli errori nella pipe di risposta.
   * @param req La richiesta HTTP originale.
   * @param next Il gestore successivo.
   * @returns Un Observable che emette l'evento o un errore formattato.
   */
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse | Error) => {

        // Gestione errori di rete (es. server offline, problemi DNS, CORS).
        // Status 0 indica che la richiesta non ha ricevuto una risposta HTTP standard.
        if (error instanceof HttpErrorResponse && error.status === 0) {
          return throwError(() => new HttpErrorResponse({
            status: 0,
            error: {
              message: 'Impossibile contattare il server.'
            }
          }));
        }

        // Gestione errore 401 (Unauthorized).
        // Solitamente indica che il token è mancante, invalido o scaduto.
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Se l'utente ha un token salvato, assumiamo che la sessione sia scaduta.
          // Eseguiamo il logout forzato e restituiamo un messaggio appropriato.
          if (this.auth.getToken()) {
            this.auth.logout();
            return throwError(() => new HttpErrorResponse({
              status: 401,
              error: {
                message: 'Sessione scaduta. Effettua nuovamente il login.'
              }
            }));
          }

          // Se non c'è token (richiesta pubblica), restituiamo il messaggio del backend o uno generico.
          return throwError(() => new HttpErrorResponse({
            status: 401,
            error: {
              message: error.error?.message || 'Non autorizzato.'
            }
          }));
        }

        // Gestione di altri codici di errore HTTP comuni (400, 403, 404, 500, ecc.).
        if (error instanceof HttpErrorResponse) {

          let message = 'Errore imprevisto.';

          switch (error.status) {
            case 400:
              message = error.error?.message || 'Richiesta non valida.';
              break;
            case 403:
              message = 'Accesso non autorizzato.';
              break;
            case 404:
              message = 'Risorsa non trovata.';
              break;
            case 422:
              message = error.error?.message || 'Dati non validi.';
              break;
            case 500:
              message = 'Errore interno del server.';
              break;
            case 429:
              message = 'Troppe richieste. Riprova più tardi.';
              break;
          }

          // Restituisce un nuovo oggetto errore con il messaggio formattato e i dettagli originali.
          return throwError(() => new HttpErrorResponse({
            status: error.status,
            error: {
              message,
              backend: error.error
            }
          }));
        }

        // Fallback per errori sconosciuti o non gestiti sopra.
        return throwError(() => new HttpErrorResponse({
          status: 500,
          error: {
            message: 'Errore sconosciuto.'
          }
        }));
      })
    );
  }
}
