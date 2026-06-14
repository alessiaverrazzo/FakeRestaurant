import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
import { of } from 'rxjs';

// Helper per mockare la richiesta HTTP di Angular (HttpRequest)
// Simula solo i metodi e le proprietà necessarie per l'interceptor.
type MockReq = {
  url: string;
  clone: (opts: any) => MockReq;
  headers: Map<string, string>;
};

function createRequest(url: string): MockReq {
  return {
    url,
    headers: new Map(),
    clone(opts: any) {
      const cloned = createRequest(url);
      if (opts?.setHeaders) {
        for (const k of Object.keys(opts.setHeaders)) {
          cloned.headers.set(k, opts.setHeaders[k]);
        }
      }
      return cloned;
    },
  };
}

describe('AuthInterceptor', () => {
  let interceptor: AuthInterceptor;
  let authServiceMock: any;
  let nextMock: any;

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn(),
      isTokenExpired: vi.fn(),
      logout: vi.fn(),
    };

    interceptor = new AuthInterceptor(authServiceMock);

    nextMock = {
      handle: vi.fn().mockReturnValue(of({})),
    };
  });

  // ----------------------------------------------------------------
  describe('Scenario: Rotte pubbliche', () => {
    it('non deve aggiungere l\'header Authorization (es. login)', () => {
      const req = createRequest('/api/users/login');

      authServiceMock.getToken.mockReturnValue('ABC');

      interceptor.intercept(req as any, nextMock);

      expect(nextMock.handle).toHaveBeenCalledWith(req);
    });
  });

  // ----------------------------------------------------------------
  describe('Scenario: Gestione URL e Parsing', () => {
    it('deve gestire correttamente una URL assoluta', () => {
      const req = createRequest('http://localhost:4200/api/test');

      authServiceMock.getToken.mockReturnValue(null);

      interceptor.intercept(req as any, nextMock);

      expect(nextMock.handle).toHaveBeenCalledOnce();
    });

    it('deve usare req.url come fallback se il parsing dell\'URL fallisce', () => {
      // Mockiamo globalThis.URL per simulare un errore di parsing
      vi.spyOn(globalThis, 'URL').mockImplementationOnce(() => {
        throw new Error('URL non valida');
      });

      const req = createRequest('relative/path');

      authServiceMock.getToken.mockReturnValue(null);

      interceptor.intercept(req as any, nextMock);

      expect(nextMock.handle).toHaveBeenCalledWith(req);
    });
  });

  // ----------------------------------------------------------------
  describe('Scenario: Rotte protette', () => {
    describe('Caso: Token assente', () => {
      it('non deve modificare la richiesta', () => {
        const req = createRequest('/zona/protetta');

        authServiceMock.getToken.mockReturnValue(null);

        interceptor.intercept(req as any, nextMock);

        expect(nextMock.handle).toHaveBeenCalledWith(req);
      });
    });

    describe('Caso: Token scaduto', () => {
      it('deve eseguire il logout e NON aggiungere l\'header', () => {
        const req = createRequest('/zona/protetta');

        authServiceMock.getToken.mockReturnValue('EXPIRED');
        authServiceMock.isTokenExpired.mockReturnValue(true);

        interceptor.intercept(req as any, nextMock);

        expect(authServiceMock.logout).toHaveBeenCalledOnce();
        expect(nextMock.handle).toHaveBeenCalledWith(req);
      });
    });

    describe('Caso: Token valido', () => {
      it('deve aggiungere l\'header Authorization', () => {
        const req = createRequest('/zona/protetta');

        authServiceMock.getToken.mockReturnValue('VALID');
        authServiceMock.isTokenExpired.mockReturnValue(false);

        interceptor.intercept(req as any, nextMock);

        // Verifichiamo che la richiesta passata a next.handle abbia l'header
        const reqUsata = nextMock.handle.mock.calls[0][0];
        expect(reqUsata.headers.get('Authorization')).toBe('Bearer VALID');
      });
    });
  });
});
