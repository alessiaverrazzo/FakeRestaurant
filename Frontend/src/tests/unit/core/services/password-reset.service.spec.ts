import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { PasswordResetService } from '@core/services/password-reset.service';

// Mock HttpService
type HttpServiceMock = {
  post: ReturnType<typeof vi.fn>;
};

describe('PasswordResetService — test principali', () => {
  let service: PasswordResetService;
  let http: HttpServiceMock;

  beforeEach(() => {
    http = {
      post: vi.fn(),
    };

    service = new PasswordResetService(http as any);
  });

  // ----------------------------------------------------------------
  describe('validateEmail', () => {
    it('accetta email valida', () => {
      const fn = (service as any).validateEmail.bind(service);

      expect(() => fn('test@example.com')).not.toThrow();
      expect(() => fn('   TEST@Example.com  ')).not.toThrow();
    });

    it('rifiuta null, undefined, non stringhe o vuote', () => {
      const fn = (service as any).validateEmail.bind(service);

      const invalid = ['', null, undefined, 123 as any];

      invalid.forEach(v => {
        expect(() => fn(v)).toThrow('Email non valida');
      });
    });

    it('rifiuta email non valide', () => {
      const fn = (service as any).validateEmail.bind(service);

      const invalid = ['abc', 'test@', '@mail.com', 'a@b', 'a@b.', 'test@@mail.com'];

      invalid.forEach(v => {
        expect(() => fn(v)).toThrow('Email non valida');
      });
    });
  });

  // ----------------------------------------------------------------
  describe('validateToken', () => {
    it('accetta token valido (base64-url safe)', () => {
      const fn = (service as any).validateToken.bind(service);

      expect(() => fn('ABC123abc-_')).not.toThrow();
    });

    it('rifiuta null, undefined, vuoti o non stringhe', () => {
      const fn = (service as any).validateToken.bind(service);

      const invalid = ['', null, undefined, 10 as any];

      invalid.forEach(v => {
        expect(() => fn(v)).toThrow('Token non valido');
      });
    });

    it('rifiuta caratteri non permessi', () => {
      const fn = (service as any).validateToken.bind(service);

      expect(() => fn('abc$123')).toThrow('Token non valido');
      expect(() => fn('xyz!')).toThrow('Token non valido');
    });

    it('rifiuta token troppo corti o troppo lunghi', () => {
      const fn = (service as any).validateToken.bind(service);

      expect(() => fn('abc123')).toThrow('Token non valido'); // < 10
      expect(() => fn('a'.repeat(400))).toThrow('Token non valido'); // > 300
    });
  });

  // ----------------------------------------------------------------
  describe('validatePassword', () => {
    it('accetta password valida (>= 8 caratteri)', () => {
      const fn = (service as any).validatePassword.bind(service);

      expect(() => fn('password')).not.toThrow();
      expect(() => fn('abcdefghi')).not.toThrow();
    });

    it('rifiuta null, undefined o stringhe corte', () => {
      const fn = (service as any).validatePassword.bind(service);

      expect(() => fn('')).toThrow('Password non valida');
      expect(() => fn(null as any)).toThrow('Password non valida');
      expect(() => fn('short')).toThrow('La password deve contenere almeno 8 caratteri');
    });
  });

  // ----------------------------------------------------------------
  describe('requestReset', () => {
    it('valida email e chiama http.post', () => {
      http.post.mockReturnValue(of({ ok: true }));

      let out: any = null;
      service.requestReset('test@example.com').subscribe(r => (out = r));

      expect(http.post).toHaveBeenCalledWith('users/password-reset', {
        email: 'test@example.com',
      });
      expect(out).toEqual({ ok: true });
    });

    it('propaga errore di validazione email e non chiama http.post', () => {
      let err: any = null;

      service.requestReset('invalid-email').subscribe({
        error: e => (err = e),
      });

      expect(err.message).toBe('Email non valida');
      expect(http.post).not.toHaveBeenCalled();
    });

    it('propaga errori http.post', () => {
      http.post.mockReturnValue(throwError(() => new Error('fail')));

      service.requestReset('test@example.com').subscribe({
        error: e => expect(e.message).toBe('fail'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('resetPassword', () => {
    it('valida token + password e chiama http.post', () => {
      http.post.mockReturnValue(of({ ok: true }));

      let out: any = null;

      service.resetPassword('ABC123abc-_', 'password123').subscribe(r => (out = r));

      expect(http.post).toHaveBeenCalledWith('users/password-reset/reset', {
        token: 'ABC123abc-_',
        password: 'password123',
      });

      expect(out).toEqual({ ok: true });
    });

    it('errore di validazione token → non chiama http.post', () => {
      let err: any = null;

      service.resetPassword('invalid!!', 'password123').subscribe({
        error: e => (err = e),
      });

      expect(err.message).toBe('Token non valido');
      expect(http.post).not.toHaveBeenCalled();
    });

    it('errore di validazione password → non chiama http.post', () => {
      let err: any = null;

      service.resetPassword('ABC123abc-_', 'short').subscribe({
        error: e => (err = e),
      });

      expect(err.message).toBe('La password deve contenere almeno 8 caratteri');
      expect(http.post).not.toHaveBeenCalled();
    });

    it('propaga errori http.post', () => {
      http.post.mockReturnValue(throwError(() => new Error('boom')));

      service.resetPassword('ABC123abc-_', 'password123').subscribe({
        error: e => expect(e.message).toBe('boom'),
      });
    });
  });
});
