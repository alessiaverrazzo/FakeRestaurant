import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

/**
 * Service wrapper per le chiamate HTTP.
 * Centralizza la configurazione della Base URL e fornisce metodi tipizzati per le operazioni CRUD.
 * Gestisce inoltre una prima formattazione degli errori.
 */
@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private readonly baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Esegue una richiesta HTTP GET.
   * @param endpoint L'endpoint relativo (es. 'users/me').
   * @param options Opzioni aggiuntive per la richiesta (headers, params, ecc.).
   * @returns Un Observable con la risposta tipizzata.
   */
  get<T>(endpoint: string, options?: object): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}/${endpoint}`, options)
      .pipe(catchError(this.handleError));
  }

  /**
   * Esegue una richiesta HTTP POST.
   * @param endpoint L'endpoint relativo.
   * @param body Il corpo della richiesta (payload).
   * @param options Opzioni aggiuntive.
   * @returns Un Observable con la risposta tipizzata.
   */
  post<T>(endpoint: string, body: any, options?: object): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}/${endpoint}`, body, options)
      .pipe(catchError(this.handleError));
  }

  /**
   * Esegue una richiesta HTTP PUT.
   * @param endpoint L'endpoint relativo.
   * @param body Il corpo della richiesta da aggiornare.
   * @param options Opzioni aggiuntive.
   * @returns Un Observable con la risposta tipizzata.
   */
  put<T>(endpoint: string, body: any, options?: object): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}/${endpoint}`, body, options)
      .pipe(catchError(this.handleError));
  }

  /**
   * Esegue una richiesta HTTP DELETE.
   * @param endpoint L'endpoint relativo della risorsa da eliminare.
   * @param options Opzioni aggiuntive.
   * @returns Un Observable con la risposta tipizzata.
   */
  delete<T>(endpoint: string, options?: object): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}/${endpoint}`, options)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gestisce gli errori HTTP trasformandoli in un oggetto Error standard.
   * @param error L'errore HTTP ricevuto.
   * @returns Un Observable che lancia un errore con un messaggio leggibile.
   */
  private handleError(error: HttpErrorResponse) {
    const message =
      error.error?.message ||
      (error.status === 0
        ? 'Errore di rete — server non raggiungibile'
        : `Errore ${error.status}: ${error.statusText}`);

    return throwError(() => new Error(message));
  }
}
