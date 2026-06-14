import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { User } from '../models/user.model';
import { map } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

/**
 * Servizio per la gestione dell'Utente corrente.
 * Gestisce il recupero del profilo, l'aggiornamento dei dati (username, password, icona)
 * e l'eliminazione dell'account.
 */
@Injectable({ providedIn: 'root' })
export class UserService {

  constructor(private http: HttpService) {}

  /**
   * Sanitizza lo username rimuovendo tag HTML e limitando la lunghezza.
   * @param username Lo username da pulire.
   */
  private sanitizeUsername(username: string): string {
    if (!username) return '';
    let cleaned = username
      .trim()
      .replace(/[<>]/g, '')
      .slice(0, 20);

    return cleaned;
  }

  /**
   * Valida l'ID dell'icona.
   * @param iconId L'ID da verificare.
   * @throws Error se l'ID non è valido.
   */
  private validateIconId(iconId: any): number {
    const n = Number(iconId);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('Invalid icon id');
    }
    return n;
  }

  /**
   * Sanitizza e valida la password.
   * @param password La password da verificare.
   * @throws Error se la password è troppo corta.
   */
  private sanitizePassword(password: string): string {
    if (!password) return '';
    let cleaned = password.trim();
    if (cleaned.length < 8) {
      throw new Error('Password too short');
    }
    return cleaned;
  }

  /**
   * Mappa la risposta del backend nel modello User sicuro.
   * Gestisce valori nulli o mancanti.
   */
  private safeMapUser(res: any): User {
    if (!res || typeof res !== 'object') {
      return {
        id: 0,
        username: '',
        email: '',
        iconId: 1,
      };
    }

    return {
      id: Number(res.id ?? 0),
      username: String(res.username ?? ''),
      email: String(res.email ?? ''),
      iconId: Number(res.icon_id ?? 1),
    };
  }

  /**
   * Recupera i dati dell'utente attualmente loggato (endpoint /me).
   * @returns Observable con i dati dell'utente.
   */
  getMe(): Observable<User> {
    return this.http.get<any>('users/me').pipe(
      map(res => this.safeMapUser(res))
    );
  }

  /**
   * Aggiorna genericamente i dati dell'utente.
   * @param data Oggetto contenente i campi opzionali da aggiornare.
   * @returns Observable con l'utente aggiornato.
   */
  updateUser(data: {
    username?: string;
    icon_id?: number;
    password?: string;
  }): Observable<User> {

    const payload: any = {};

    // username
    if (data.username !== undefined) {
      const u = this.sanitizeUsername(data.username);
      if (!u) {
        return throwError(() => new Error('Username non valido'));
      }
      payload.username = u;
    }

    // icon
    if (data.icon_id !== undefined) {
      payload.icon_id = this.validateIconId(data.icon_id);
    }

    // password
    if (data.password !== undefined) {
      payload.password = this.sanitizePassword(data.password);
    }

    return this.http.put<any>('users/me', payload).pipe(
      map(res => this.safeMapUser(res))
    );
  }

  /**
   * Aggiorna solo lo username.
   */
  updateUsername(username: string): Observable<User> {
    return this.updateUser({ username });
  }

  /**
   * Aggiorna solo l'icona del profilo.
   */
  updateIcon(iconId: number): Observable<User> {
    return this.updateUser({ icon_id: iconId });
  }

  /**
   * Aggiorna solo la password.
   */
  updatePassword(password: string): Observable<User> {
    return this.updateUser({ password });
  }

  /**
   * Elimina l'account dell'utente corrente.
   */
  deleteUser(): Observable<void> {
    return this.http.delete<void>('users/me');
  }
}
