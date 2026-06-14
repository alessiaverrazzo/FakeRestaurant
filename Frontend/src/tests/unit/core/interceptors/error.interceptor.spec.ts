import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorInterceptor } from '@core/interceptors/error.interceptor';
import { throwError, firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

type MockReq = { url: string };

function createReq(url: string): MockReq {
  return { url };
}

// =======================================================
//  MOCK HTTP ERROR RESPONSE 
// =======================================================

function createHttpError(status: number, body: any = {}) {
  return new HttpErrorResponse({
    status,
    error: body,
    statusText: 'Error',
    url: '/test'
  });
}

describe('ErrorInterceptor', () => {
  let interceptor: ErrorInterceptor;
  let authMock: any;
  let nextMock: any;

  beforeEach(() => {
    authMock = {
      getToken: vi.fn(),
      logout: vi.fn(),
    };

    interceptor = new ErrorInterceptor(authMock);

    nextMock = {
      handle: vi.fn(),
    };
  });

  // ----------------------------------------------------------------
  describe('Scenario: Server irraggiungibile', () => {
    it('deve restituire un messaggio chiaro quando il server è irraggiungibile (status 0)', async () => {
      const req = createReq('/test');

      const error = createHttpError(0);

      nextMock.handle.mockReturnValue(throwError(() => error));

      try {
        await firstValueFrom(interceptor.intercept(req as any, nextMock));
      } catch (err: any) {
        expect(err.status).toBe(0);
        expect(err.error.message).toBe('Impossibile contattare il server.');
      }
    });
  });

  // ----------------------------------------------------------------
  describe('Scenario: Errore 401 (Unauthorized)', () => {
    describe('Caso: Utente con token (Sessione scaduta)', () => {
      it('deve effettuare il logout e restituire messaggio sessione scaduta se arriva un 401 con token presente', async () => {
        const req = createReq('/protetto');

        authMock.getToken.mockReturnValue('TOKEN');
        const error = createHttpError(401);

        nextMock.handle.mockReturnValue(throwError(() => error));

        try {
          await firstValueFrom(interceptor.intercept(req as any, nextMock));
        } catch (err: any) {
          expect(authMock.logout).toHaveBeenCalledOnce();
          expect(err.status).toBe(401);
          expect(err.error.message).toBe('Sessione scaduta. Effettua nuovamente il login.');
        }
      });
    });

    describe('Caso: Utente senza token', () => {
      it('non deve fare logout e deve restituire il messaggio del backend per un 401 senza token', async () => {
        const req = createReq('/pubblico');

        authMock.getToken.mockReturnValue(null);
        const error = createHttpError(401, { message: 'Non autorizzato custom.' });

        nextMock.handle.mockReturnValue(throwError(() => error));

        try {
          await firstValueFrom(interceptor.intercept(req as any, nextMock));
        } catch (err: any) {
          expect(authMock.logout).not.toHaveBeenCalled();
          expect(err.status).toBe(401);
          expect(err.error.message).toBe('Non autorizzato custom.');
        }
      });

      it('deve restituire il messaggio di default per un 401 senza token e senza message', async () => {
        const req = createReq('/pubblico');

        authMock.getToken.mockReturnValue(null);

        const error = createHttpError(401, {});

        nextMock.handle.mockReturnValue(throwError(() => error));

        try {
          await firstValueFrom(interceptor.intercept(req as any, nextMock));
        } catch (err: any) {
          expect(authMock.logout).not.toHaveBeenCalled();
          expect(err.status).toBe(401);
          expect(err.error.message).toBe('Non autorizzato.');
        }
      });
    });
  });

  // ----------------------------------------------------------------
  describe('Scenario: Altri codici di errore HTTP', () => {
    const cases = [
      { status: 400, msg: 'Richiesta non valida.' },
      { status: 403, msg: 'Accesso non autorizzato.' },
      { status: 404, msg: 'Risorsa non trovata.' },
      { status: 422, msg: 'Dati non validi.' },
      { status: 500, msg: 'Errore interno del server.' },
      { status: 429, msg: 'Troppe richieste. Riprova più tardi.' },
    ];

    cases.forEach(({ status, msg }) => {
      it(`deve gestire correttamente l'errore ${status}`, async () => {
        const req = createReq('/test');

        const error = createHttpError(status);

        nextMock.handle.mockReturnValue(throwError(() => error));

        try {
          await firstValueFrom(interceptor.intercept(req as any, nextMock));
        } catch (err: any) {
          expect(err.status).toBe(status);
          expect(err.error.message).toBe(msg);
          expect(err.error.backend).toBeDefined();
        }
      });
    });
  });

  // ----------------------------------------------------------------
  describe('Scenario: Fallback generale (Errori non-HTTP)', () => {
    it('deve restituire errore sconosciuto per errori generici (non HttpErrorResponse)', async () => {
      const req = createReq('/test');

      const error = new Error('Errore generico JS');

      nextMock.handle.mockReturnValue(throwError(() => error));

      try {
        await firstValueFrom(interceptor.intercept(req as any, nextMock));
      } catch (err: any) {
        expect(err.status).toBe(500);
        expect(err.error.message).toBe('Errore sconosciuto.');
      }
    });
  });
});
