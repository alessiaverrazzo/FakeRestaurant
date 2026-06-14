import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { HttpService } from './http.service';
import { AppState } from '../state/app.state';
import { User } from '../models/user.model';
import { SocketService } from './socket.service';
import { Router } from '@angular/router';

interface AuthResponseDTO {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    icon_id: number;
  };
}

/**
 * Servizio di autenticazione.
 * Gestisce il login, la registrazione, il logout e il mantenimento della sessione utente.
 * Si occupa anche di connettere/disconnettere il socket in base allo stato di login.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly userSignal = signal<User | null>(null);

  constructor(
    private http: HttpService,
    private appState: AppState,
    private socketService: SocketService,
    private router: Router
  ) {
    queueMicrotask(() => this.restoreSession());
  }

  /**
   * Effettua il login dell'utente.
   * @param identifier Username o email.
   * @param password Password in chiaro.
   * @returns Observable dell'utente loggato.
   */
  login(identifier: string, password: string): Observable<User> {
    const payload = {
      identifier: identifier.trim(), // sanitizzazione minima lato FE
      password,                      // la password non viene toccata
    };

    return this.http.post<AuthResponseDTO>('users/login', payload).pipe(
      map(res => {
        const user = this.mapUser(res.user);
        this.saveSession(res.token, user);
        return user;
      }),
      tap(user => {
        this.appState.setUser(user);
        this.socketService.connect(user.id);
      })
    );
  }

  /**
   * Registra un nuovo utente.
   * @param username Nome utente desiderato.
   * @param email Indirizzo email.
   * @param password Password.
   * @param iconId ID dell'icona profilo scelta.
   * @returns Observable dell'utente registrato.
   */
  register(username: string, email: string, password: string, iconId: number): Observable<User> {
    const payload = {
      username: username.trim(),
      email: email.trim(),
      password,
      icon_id: iconId,
    };

    return this.http
      .post<AuthResponseDTO>('users/register', payload)
      .pipe(
        map(res => {
          const user = this.mapUser(res.user);
          this.saveSession(res.token, user);
          return user;
        }),
        tap(user => {
          this.appState.setUser(user);
          this.socketService.connect(user.id);
        })
      );
  }

  /**
   * Effettua il logout dell'utente.
   * Rimuove il token, resetta lo stato dell'applicazione, disconnette il socket
   * e reindirizza alla home page.
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userSignal.set(null);
    this.appState.reset();
    this.socketService.disconnect();
    localStorage.removeItem("user");

    // Redirect sicuro alla home
    this.router.navigate(['/']);
  }

  /** Restituisce l'utente attualmente loggato (o null). */
  get user(): User | null {
    return this.userSignal();
  }

  /** Verifica se l'utente è loggato. */
  isLoggedIn(): boolean {
    return !!this.userSignal();
  }

  /** Recupera il token JWT dal LocalStorage. */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /** Salva i dati di sessione (token e utente) nel LocalStorage e nello stato applicativo. */
  private saveSession(token: string, user: User): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem("user", JSON.stringify(user));
    this.userSignal.set(user);
  }

  /**
   * Tenta di ripristinare la sessione all'avvio dell'applicazione.
   * Verifica se esiste un token valido e, in caso affermativo, recupera i dati utente dal backend.
   */
  private restoreSession(): void {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      //this.appState.reset();
      return;
    }

    // Se il token è scaduto → reset totale
    if (this.isTokenExpired(token)) {
      localStorage.removeItem(this.tokenKey);
      this.appState.reset();
      return;
    }

    this.http.get<any>('users/me')
      .pipe(
        map(data => this.mapUser(data)),
        tap(user => {
          this.userSignal.set(user);
          this.appState.setUser(user);
          this.socketService.connect(user.id);
        }),
        catchError(() => {
          // Token server-side invalido → reset sessione
          localStorage.removeItem(this.tokenKey);
          this.appState.reset();
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Verifica se un token JWT è scaduto.
   * Decodifica il payload del token e controlla il campo 'exp'.
   * @param token Il token JWT da verificare.
   * @returns true se il token è scaduto o non valido, false altrimenti.
   */
  public isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (!payload.exp) return true;
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  /** Mappa i dati grezzi ricevuti dal backend nel modello User del frontend. */
  private mapUser(data: any): User {
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      iconId: data.icon_id,
    };
  }
}
