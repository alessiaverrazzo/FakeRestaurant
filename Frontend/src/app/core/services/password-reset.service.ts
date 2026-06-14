import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpService } from './http.service';

/**
 * Servizio per la gestione del recupero password.
 * Fornisce metodi per richiedere il link di reset e per impostare una nuova password,
 * includendo validazioni preliminari lato client.
 */
@Injectable({
  providedIn: 'root',
})
export class PasswordResetService {

  constructor(private http: HttpService) {}

  /**
   * Valida il formato dell'indirizzo email.
   * @param email L'email da verificare.
   * @throws Error se l'email è vuota, non è una stringa o non rispetta il formato regex.
   */
  private validateEmail(email: string): void {
    if (!email || typeof email !== 'string') {
      throw new Error('Email non valida');
    }

    const cleaned = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleaned)) {
      throw new Error('Email non valida');
    }
  }

  /**
   * Valida il token di reset.
   * @param token Il token da verificare.
   * @throws Error se il token è invalido, contiene caratteri non permessi o ha lunghezza errata.
   */
  private validateToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new Error('Token non valido');
    }

    const cleaned = token.trim();

    // Caratteri permessi: base64-url safe o uuid-like
    if (!/^[A-Za-z0-9\-_]+$/.test(cleaned)) {
      throw new Error('Token non valido');
    }

    // Evitiamo payload troppo lunghi
    if (cleaned.length < 10 || cleaned.length > 300) {
      throw new Error('Token non valido');
    }
  }

  /**
   * Valida la nuova password scelta dall'utente.
   * @param password La password da verificare.
   * @throws Error se la password è troppo corta (< 8 caratteri).
   */
  private validatePassword(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new Error('Password non valida');
    }

    if (password.length < 8) {
      throw new Error('La password deve contenere almeno 8 caratteri');
    }
  }

  /**
   * Richiede l'invio di un link per il reset della password.
   * @param email L'indirizzo email dell'account da recuperare.
   * @returns Observable della risposta del backend.
   */
  requestReset(email: string): Observable<any> {
    try {
      this.validateEmail(email);
    } catch (err) {
      return throwError(() => err);
    }

    const cleaned = email.trim().toLowerCase();

    return this.http.post('users/password-reset', { email: cleaned });
  }

  /**
   * Imposta una nuova password utilizzando un token valido.
   * @param token Il token di reset ricevuto via email.
   * @param password La nuova password desiderata.
   * @returns Observable della risposta del backend.
   */
  resetPassword(token: string, password: string): Observable<any> {
    try {
      this.validateToken(token);
      this.validatePassword(password);
    } catch (err) {
      return throwError(() => err);
    }

    return this.http.post('users/password-reset/reset', {
      token: token.trim(),
      password
    });
  }
}
