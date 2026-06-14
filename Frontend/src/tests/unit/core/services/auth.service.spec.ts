import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import type { User } from '@core/models/user.model';

// Mocks
type HttpServiceMock = {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

type AppStateMock = {
  setUser: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
};

type SocketServiceMock = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

type RouterMock = {
  navigate: ReturnType<typeof vi.fn>;
};

// Helper per creare JWT dummy
function createJwt(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encode = (obj: any) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${encode(header)}.${encode(payload)}.signature`;
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpServiceMock;
  let appState: AppStateMock;
  let socket: SocketServiceMock;
  let router: RouterMock;

  beforeEach(() => {
    localStorage.clear();

    http = {
      post: vi.fn(),
      get: vi.fn(),
    };

    appState = {
      setUser: vi.fn(),
      reset: vi.fn(),
    };

    socket = {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    router = {
      navigate: vi.fn(),
    };

    service = new AuthService(
      http as any,
      appState as any,
      socket as any,
      router as any
    );
  });

  // ----------------------------------------------------------------
  describe('login', () => {
    it('deve effettuare il login con successo, trim dell\'identifier, salvare sessione, aggiornare stato e connettere il socket', () => {
      const apiResponse = {
        token: 'FAKE_TOKEN',
        user: {
          id: 1,
          username: 'alice',
          email: 'alice@example.com',
          icon_id: 3,
        },
      };

      http.post.mockReturnValue(of(apiResponse));

      let emittedUser: User | null = null;

      service.login('  alice  ', 'password123').subscribe((user) => {
        emittedUser = user;
      });

      // Payload inviato
      expect(http.post).toHaveBeenCalledTimes(1);
      const [endpoint, payload] = http.post.mock.calls[0];
      expect(endpoint).toBe('users/login');
      expect(payload).toEqual({
        identifier: 'alice', // trimmed
        password: 'password123',
      });

      // User mappato
      expect(emittedUser).toEqual({
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        iconId: 3,
      });

      // Sessione salvata
      expect(localStorage.getItem('token')).toBe('FAKE_TOKEN');
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      expect(storedUser).toEqual({
        id: 1,
        username: 'alice',
        email: 'alice@example.com',
        iconId: 3,
      });

      // Stato globale + socket
      expect(appState.setUser).toHaveBeenCalledWith(emittedUser);
      expect(socket.connect).toHaveBeenCalledWith(1);

      // Getter + isLoggedIn
      expect(service.user).toEqual(emittedUser);
      expect(service.isLoggedIn()).toBe(true);
    });

    it('deve propagare l\'errore e NON salvare la sessione se il login fallisce', () => {
      const error = new Error('Credenziali non valide');
      http.post.mockReturnValue(throwError(() => error));

      let receivedError: any = null;

      service.login('alice', 'wrong').subscribe({
        next: () => {
          // non deve entrare
          expect(false).toBe(true);
        },
        error: (err) => {
          receivedError = err;
        },
      });

      expect(receivedError).toBe(error);

      // Nessuna sessione salvata
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();

      // Nessun update di stato / socket
      expect(appState.setUser).not.toHaveBeenCalled();
      expect(socket.connect).not.toHaveBeenCalled();

      // Stato interno
      expect(service.user).toBeNull();
      expect(service.isLoggedIn()).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('register', () => {
    it('deve registrare con successo, trim di username/email, salvare sessione, aggiornare stato e connettere il socket', () => {
      const apiResponse = {
        token: 'REGISTER_TOKEN',
        user: {
          id: 2,
          username: 'bob',
          email: 'bob@example.com',
          icon_id: 5,
        },
      };

      http.post.mockReturnValue(of(apiResponse));

      let emittedUser: User | null = null;

      service
        .register('  bob  ', '  bob@example.com ', 'pwd', 5)
        .subscribe((user) => {
          emittedUser = user;
        });

      // Payload inviato
      expect(http.post).toHaveBeenCalledTimes(1);
      const [endpoint, payload] = http.post.mock.calls[0];
      expect(endpoint).toBe('users/register');
      expect(payload).toEqual({
        username: 'bob',
        email: 'bob@example.com',
        password: 'pwd',
        icon_id: 5,
      });

      // User mappato
      expect(emittedUser).toEqual({
        id: 2,
        username: 'bob',
        email: 'bob@example.com',
        iconId: 5,
      });

      // Sessione salvata
      expect(localStorage.getItem('token')).toBe('REGISTER_TOKEN');
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      expect(storedUser).toEqual({
        id: 2,
        username: 'bob',
        email: 'bob@example.com',
        iconId: 5,
      });

      expect(appState.setUser).toHaveBeenCalledWith(emittedUser);
      expect(socket.connect).toHaveBeenCalledWith(2);
    });

    it('deve propagare l\'errore e NON salvare la sessione se la registrazione fallisce', () => {
      const error = new HttpErrorResponse({
        status: 400,
        error: { message: 'Email già usata' },
      });

      http.post.mockReturnValue(throwError(() => error));

      let receivedError: any = null;

      service
        .register('bob', 'bob@example.com', 'pwd', 5)
        .subscribe({
          next: () => expect(false).toBe(true),
          error: (err) => (receivedError = err),
        });

      expect(receivedError).toBe(error);

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(appState.setUser).not.toHaveBeenCalled();
      expect(socket.connect).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('logout', () => {
    it('deve pulire localStorage, resettare lo stato, disconnettere il socket e navigare alla home', () => {
      // Prepara una sessione simulata
      const user: User = {
        id: 10,
        username: 'test',
        email: 't@test.com',
        iconId: 1,
      };

      (service as any).saveSession('TOKEN123', user);

      expect(service.user).toEqual(user);
      expect(localStorage.getItem('token')).toBe('TOKEN123');
      expect(localStorage.getItem('user')).not.toBeNull();

      service.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(service.user).toBeNull();

      expect(appState.reset).toHaveBeenCalledTimes(1);
      expect(socket.disconnect).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('deve essere sicuro anche se non c\'è nessuna sessione', () => {
      expect(() => service.logout()).not.toThrow();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(appState.reset).toHaveBeenCalledTimes(1);
      expect(socket.disconnect).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  // ----------------------------------------------------------------
  describe('getter e gestione token', () => {
    it('isLoggedIn deve riflettere correttamente lo stato utente', () => {
      expect(service.isLoggedIn()).toBe(false);

      const user: User = {
        id: 3,
        username: 'utente',
        email: 'u@u.it',
        iconId: 2,
      };

      (service as any).saveSession('TOK', user);

      expect(service.isLoggedIn()).toBe(true);
      expect(service.user).toEqual(user);
    });

    it('getToken deve restituire il token se presente e null se assente', () => {
      expect(service.getToken()).toBeNull();

      localStorage.setItem('token', 'ABC');
      expect(service.getToken()).toBe('ABC');

      localStorage.removeItem('token');
      expect(service.getToken()).toBeNull();
    });

    it('saveSession deve salvare token e user in localStorage e aggiornare il signal', () => {
      const user: User = {
        id: 4,
        username: 'pippo',
        email: 'p@p.it',
        iconId: 7,
      };

      (service as any).saveSession('SESSION_TOKEN', user);

      expect(localStorage.getItem('token')).toBe('SESSION_TOKEN');
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      expect(storedUser).toEqual(user);
      expect(service.user).toEqual(user);
    });
  });

  // ----------------------------------------------------------------
  describe('restoreSession', () => {
    it('non deve fare nulla se il token non è presente', () => {
      (service as any).restoreSession();

      expect(appState.reset).not.toHaveBeenCalled();
      expect(http.get).not.toHaveBeenCalled();
      expect(socket.connect).not.toHaveBeenCalled();
      expect(service.user).toBeNull();
    });

    it('deve resettare tutto se il token è scaduto', () => {
      // token con exp nel passato
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 60,
      };
      const token = createJwt(expiredPayload);
      localStorage.setItem('token', token);

      (service as any).restoreSession();

      expect(localStorage.getItem('token')).toBeNull();
      expect(appState.reset).toHaveBeenCalledTimes(1);
      expect(http.get).not.toHaveBeenCalled();
      expect(socket.connect).not.toHaveBeenCalled();
      expect(service.user).toBeNull();
    });

    it('deve resettare se la chiamata /users/me fallisce (token invalido lato server)', () => {
      const validPayload = {
        exp: Math.floor(Date.now() / 1000) + 60,
      };
      const token = createJwt(validPayload);
      localStorage.setItem('token', token);

      http.get.mockReturnValue(throwError(() => new Error('Token invalido')));

      (service as any).restoreSession();

      expect(localStorage.getItem('token')).toBeNull();
      expect(appState.reset).toHaveBeenCalledTimes(1);
      expect(socket.connect).not.toHaveBeenCalled();
      expect(service.user).toBeNull();
    });

    it('deve ricostruire correttamente la sessione se token valido e /users/me ha successo', () => {
      const validPayload = {
        exp: Math.floor(Date.now() / 1000) + 60,
      };
      const token = createJwt(validPayload);
      localStorage.setItem('token', token);

      const apiUser = {
        id: 9,
        username: 'restored',
        email: 'r@r.it',
        icon_id: 4,
      };

      http.get.mockReturnValue(of(apiUser));

      (service as any).restoreSession();

      const expectedUser: User = {
        id: 9,
        username: 'restored',
        email: 'r@r.it',
        iconId: 4,
      };

      expect(service.user).toEqual(expectedUser);
      expect(appState.setUser).toHaveBeenCalledWith(expectedUser);
      expect(socket.connect).toHaveBeenCalledWith(9);
      expect(localStorage.getItem('token')).toBe(token); // il token resta
    });
  });

  // ----------------------------------------------------------------
  describe('isTokenExpired', () => {
    it('deve restituire false per un token con exp nel futuro', () => {
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const token = createJwt(payload);

      expect(service.isTokenExpired(token)).toBe(false);
    });

    it('deve restituire true per un token con exp nel passato', () => {
      const payload = {
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const token = createJwt(payload);

      expect(service.isTokenExpired(token)).toBe(true);
    });

    it('deve restituire true per un token senza exp', () => {
      const payload = { foo: 'bar' };
      const token = createJwt(payload);

      expect(service.isTokenExpired(token)).toBe(true);
    });

    it('deve restituire true per un token malformato', () => {
      const badToken = 'not.a.valid.token';

      expect(service.isTokenExpired(badToken)).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('mapUser', () => {
    it('deve mappare correttamente i campi da DTO a User', () => {
      const dto = {
        id: 5,
        username: 'user5',
        email: 'u5@mail.it',
        icon_id: 8,
      };

      const user = (service as any).mapUser(dto);

      expect(user).toEqual({
        id: 5,
        username: 'user5',
        email: 'u5@mail.it',
        iconId: 8,
      });
    });

    it('può lanciare se i campi richiesti mancano (edge case)', () => {
      expect(() => (service as any).mapUser(null)).toThrow();
    });
  });
});
