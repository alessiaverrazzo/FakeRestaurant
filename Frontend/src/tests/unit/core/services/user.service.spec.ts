import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '@core/services/user.service';
import type { User } from '@core/models/user.model';
import { of, throwError } from 'rxjs';

// Mock HttpService
type HttpMock = {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('UserService — test completi', () => {
  let service: UserService;
  let http: HttpMock;

  beforeEach(() => {
    http = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    service = new UserService(http as any);
  });

  describe('sanitizeUsername', () => {
    it('trimma, rimuove < > e taglia a 20', () => {
      const res = (service as any).sanitizeUsername('   <ciao>questoèunnomeLUNGO   ');
      expect(res).toBe('ciaoquestoèunnomeLUN');
      expect(res.length).toBeLessThanOrEqual(20);
    });

    it('ritorna stringa vuota se null/undefined', () => {
      expect((service as any).sanitizeUsername('')).toBe('');
      expect((service as any).sanitizeUsername(null)).toBe('');
      expect((service as any).sanitizeUsername(undefined)).toBe('');
    });

    it('ritorna stringa vuota per input solo spazi', () => {
      expect((service as any).sanitizeUsername('    ')).toBe('');
    });

    it('taglia username molto lungo', () => {
      const long = 'a'.repeat(100);
      expect((service as any).sanitizeUsername(long)).toBe('a'.repeat(20));
    });
  });

  // ----------------------------------------------------------------
  describe('validateIconId', () => {
    it('accetta numeri interi positivi', () => {
      expect((service as any).validateIconId(5)).toBe(5);
    });

    it('rifiuta 0, negativi, non numeri, float, null, undefined', () => {
      const invalid = [0, -1, 'abc', 3.14, null, undefined];
      invalid.forEach(v => {
        expect(() => (service as any).validateIconId(v)).toThrow('Invalid icon id');
      });
    });
  });

  // ----------------------------------------------------------------
  describe('sanitizePassword', () => {
    it('trimma password valida >= 8 caratteri', () => {
      const res = (service as any).sanitizePassword('  password123  ');
      expect(res).toBe('password123');
    });

    it('ritorna stringa vuota per null/undefined', () => {
      expect((service as any).sanitizePassword(null)).toBe('');
      expect((service as any).sanitizePassword(undefined)).toBe('');
    });

    it('lancia errore se lunghezza < 8', () => {
      expect(() => (service as any).sanitizePassword(' short ')).toThrow('Password too short');
    });
  });

  // ----------------------------------------------------------------
  describe('safeMapUser', () => {
    it('mappa correttamente user valido', () => {
      const dto = { id: 2, username: 'a', email: 'b', icon_id: 7 };
      const u = (service as any).safeMapUser(dto);
      expect(u).toEqual({
        id: 2,
        username: 'a',
        email: 'b',
        iconId: 7,
      });
    });

    it('usa fallback per valori null/undefined', () => {
      const dto = { id: null, username: null, email: null, icon_id: null };
      const u = (service as any).safeMapUser(dto);
      expect(u).toEqual({
        id: 0,
        username: '',
        email: '',
        iconId: 1,
      });
    });

    it('usa fallback per oggetto vuoto', () => {
      const u = (service as any).safeMapUser({});
      expect(u).toEqual({
        id: 0,
        username: '',
        email: '',
        iconId: 1,
      });
    });

    it('non lancia errori per input non validi (edge case)', () => {
      const u = (service as any).safeMapUser(undefined);
      expect(u).toEqual({
        id: 0,
        username: '',
        email: '',
        iconId: 1,
      });
    });
  });

  // ----------------------------------------------------------------
  describe('getMe', () => {
    it('deve restituire l\'utente mappato', () => {
      http.get.mockReturnValue(of({
        id: 9,
        username: 'me',
        email: 'm@m.it',
        icon_id: 3
      }));

      let result: User | null = null;

      service.getMe().subscribe(u => result = u);

      expect(result).toEqual({
        id: 9,
        username: 'me',
        email: 'm@m.it',
        iconId: 3
      });

      expect(http.get).toHaveBeenCalledWith('users/me');
    });

    it('propaga errori backend', () => {
      const error = new Error('Errore BE');
      http.get.mockReturnValue(throwError(() => error));

      let received: any = null;

      service.getMe().subscribe({
        error: err => received = err
      });

      expect(received).toBe(error);
    });
  });

  // ----------------------------------------------------------------
  describe('updateUser', () => {
    it('aggiorna solo username (valido)', () => {
      http.put.mockReturnValue(of({
        id: 1, username: 'new', email: 'x', icon_id: 4
      }));

      let result: User | null = null;

      service.updateUser({ username: ' new ' }).subscribe(u => result = u);

      expect(http.put).toHaveBeenCalledTimes(1);
      expect(http.put.mock.calls[0][0]).toBe('users/me');
      expect(http.put.mock.calls[0][1]).toEqual({ username: 'new' });

      expect(result).toEqual({
        id: 1,
        username: 'new',
        email: 'x',
        iconId: 4
      });
    });

    it('username vuoto → errore "Username non valido"', () => {
      let received: any = null;

      service.updateUser({ username: '   ' }).subscribe({
        error: err => received = err
      });

      expect(received.message).toBe('Username non valido');
      expect(http.put).not.toHaveBeenCalled();
    });

    it('icon_id valido', () => {
      http.put.mockReturnValue(of({
        id: 1, username: 'a', email: 'b', icon_id: 6
      }));

      let r: User | null = null;

      service.updateUser({ icon_id: 6 }).subscribe(u => r = u);

      expect(http.put.mock.calls[0][1]).toEqual({ icon_id: 6 });

      expect(r).toEqual({
        id: 1,
        username: 'a',
        email: 'b',
        iconId: 6
      });
    });

    it('icon_id non valido → throw', () => {
      expect(() => service.updateUser({ icon_id: 'abc' } as any)).toThrow();
      expect(http.put).not.toHaveBeenCalled();
    });

    it('password valida', () => {
      http.put.mockReturnValue(of({
        id: 1, username: 'u', email: 'e', icon_id: 4
      }));

      let r: User | null = null;

      service.updateUser({ password: '  password123 ' }).subscribe(u => r = u);

      expect(http.put.mock.calls[0][1]).toEqual({
        password: 'password123'
      });

      expect(r).toEqual({
        id: 1,
        username: 'u',
        email: 'e',
        iconId: 4
      });
    });

    it('password corta → throw', () => {
      expect(() => service.updateUser({ password: ' short ' } as any)).toThrow();
      expect(http.put).not.toHaveBeenCalled();
    });

    it('payload vuoto → invia {}', () => {
      http.put.mockReturnValue(of({
        id: 1, username: '', email: '', icon_id: 1
      }));

      let out: User | null = null;

      service.updateUser({}).subscribe(u => out = u);

      expect(http.put.mock.calls[0][1]).toEqual({});
    });

    it('combinazione username + icon + password', () => {
      http.put.mockReturnValue(of({
        id: 1,
        username: 'u',
        email: 'e',
        icon_id: 3
      }));

      let r: User | null = null;

      service.updateUser({
        username: '<us>',
        icon_id: 3,
        password: 'passwordOK'
      }).subscribe(u => r = u);

      expect(http.put.mock.calls[0][1]).toEqual({
        username: 'us',
        icon_id: 3,
        password: 'passwordOK'
      });
    });

    it('propaga errori http', () => {
      http.put.mockReturnValue(throwError(() => new Error('fail')));

      let received: any = null;

      service.updateUser({ username: 'good' }).subscribe({
        error: err => received = err
      });

      expect(received.message).toBe('fail');
    });
  });

  // ----------------------------------------------------------------
  describe('updateUsername / updateIcon / updatePassword', () => {
    it('updateUsername chiama updateUser con il campo giusto', () => {
      const spy = vi.spyOn(service, 'updateUser').mockReturnValue(of({} as any));
      service.updateUsername('pippo');
      expect(spy).toHaveBeenCalledWith({ username: 'pippo' });
    });

    it('updateIcon chiama updateUser con il campo giusto', () => {
      const spy = vi.spyOn(service, 'updateUser').mockReturnValue(of({} as any));
      service.updateIcon(4);
      expect(spy).toHaveBeenCalledWith({ icon_id: 4 });
    });

    it('updatePassword chiama updateUser con il campo giusto', () => {
      const spy = vi.spyOn(service, 'updateUser').mockReturnValue(of({} as any));
      service.updatePassword('password123');
      expect(spy).toHaveBeenCalledWith({ password: 'password123' });
    });
  });
  
  // ----------------------------------------------------------------
  describe('deleteUser', () => {
    it('chiama http.delete("users/me") e completa correttamente', () => {
      http.delete.mockReturnValue(of(void 0));

      let completed = false;

      service.deleteUser().subscribe(() => completed = true);

      expect(completed).toBe(true);
      expect(http.delete).toHaveBeenCalledWith('users/me');
    });

    it('propaga errori', () => {
      const err = new Error('delete failed');
      http.delete.mockReturnValue(throwError(() => err));

      let received: any = null;

      service.deleteUser().subscribe({
        error: e => received = e
      });

      expect(received).toBe(err);
    });
  });

});
