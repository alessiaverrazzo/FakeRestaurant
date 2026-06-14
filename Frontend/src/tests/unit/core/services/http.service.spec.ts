import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpService } from '@core/services/http.service';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

type HttpClient = any;

describe('HttpService — versione completa', () => {
  let service: HttpService;

  let httpClientMock: {
    get: any;
    post: any;
    put: any;
    delete: any;
  };

  beforeEach(() => {
    httpClientMock = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    service = new HttpService(httpClientMock as HttpClient);
  });

  // Mock errori
  const backendError = new HttpErrorResponse({
    error: { message: 'Errore backend' },
    status: 400,
  });

  const networkError = new HttpErrorResponse({
    status: 0,
    statusText: 'Network Error',
  });

  const genericError = new HttpErrorResponse({
    status: 500,
    statusText: 'Server Explosion',
  });

  // Helper per testare success/complete
  function expectSuccessObservable<T>(obs$: any, expected: T) {
    let emitted: any = null;
    let completed = false;

    obs$.subscribe({
      next: (value: any) => (emitted = value),
      complete: () => (completed = true),
    });

    expect(emitted).toEqual(expected);
    expect(completed).toBe(true);
  }

  // ----------------------------------------------------------------
  describe('GET', () => {
    it('successo: chiama correttamente la URL e completa', () => {
      httpClientMock.get.mockReturnValue(of({ ok: true }));

      expectSuccessObservable(service.get('test'), { ok: true });

      expect(httpClientMock.get).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        undefined
      );
    });

    it('errore backend: gestisce error.error.message', () => {
      httpClientMock.get.mockReturnValue(throwError(() => backendError));

      service.get('x').subscribe({
        next: () => expect(false).toBe(true),
        error: (err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe('Errore backend');
        },
      });
    });

    it('errore di rete: status 0', () => {
      httpClientMock.get.mockReturnValue(throwError(() => networkError));

      service.get('x').subscribe({
        error: (err) => {
          expect(err.message).toBe('Errore di rete — server non raggiungibile');
        },
      });
    });

    it('errore generico: 500 + statusText', () => {
      httpClientMock.get.mockReturnValue(throwError(() => genericError));

      service.get('x').subscribe({
        error: (err) => {
          expect(err.message).toBe('Errore 500: Server Explosion');
        },
      });
    });
  });

  // ----------------------------------------------------------------
  describe('POST', () => {
    it('successo', () => {
      httpClientMock.post.mockReturnValue(of({ created: true }));

      expectSuccessObservable(service.post('users', { n: 1 }), { created: true });

      expect(httpClientMock.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/users',
        { n: 1 },
        undefined
      );
    });

    it('errore backend', () => {
      httpClientMock.post.mockReturnValue(throwError(() => backendError));

      service.post('x', {}).subscribe({
        error: (err) => expect(err.message).toBe('Errore backend'),
      });
    });

    it('errore rete', () => {
      httpClientMock.post.mockReturnValue(throwError(() => networkError));

      service.post('x', {}).subscribe({
        error: (err) =>
          expect(err.message).toBe('Errore di rete — server non raggiungibile'),
      });
    });

    it('errore generico', () => {
      httpClientMock.post.mockReturnValue(throwError(() => genericError));

      service.post('x', {}).subscribe({
        error: (err) => expect(err.message).toBe('Errore 500: Server Explosion'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('PUT', () => {
    it('successo', () => {
      httpClientMock.put.mockReturnValue(of({ updated: true }));

      expectSuccessObservable(service.put('item/12', { a: 1 }), {
        updated: true,
      });

      expect(httpClientMock.put).toHaveBeenCalledWith(
        'http://localhost:3000/api/item/12',
        { a: 1 },
        undefined
      );
    });

    it('errore backend', () => {
      httpClientMock.put.mockReturnValue(throwError(() => backendError));

      service.put('x', {}).subscribe({
        error: (err) => expect(err.message).toBe('Errore backend'),
      });
    });

    it('errore rete', () => {
      httpClientMock.put.mockReturnValue(throwError(() => networkError));

      service.put('x', {}).subscribe({
        error: (err) =>
          expect(err.message).toBe('Errore di rete — server non raggiungibile'),
      });
    });

    it('errore generico', () => {
      httpClientMock.put.mockReturnValue(throwError(() => genericError));

      service.put('x', {}).subscribe({
        error: (err) => expect(err.message).toBe('Errore 500: Server Explosion'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('DELETE', () => {
    it('successo', () => {
      httpClientMock.delete.mockReturnValue(of({ deleted: true }));

      expectSuccessObservable(service.delete('item/22'), { deleted: true });

      expect(httpClientMock.delete).toHaveBeenCalledWith(
        'http://localhost:3000/api/item/22',
        undefined
      );
    });

    it('errore backend', () => {
      httpClientMock.delete.mockReturnValue(throwError(() => backendError));

      service.delete('x').subscribe({
        error: (err) => expect(err.message).toBe('Errore backend'),
      });
    });

    it('errore rete', () => {
      httpClientMock.delete.mockReturnValue(throwError(() => networkError));

      service.delete('x').subscribe({
        error: (err) =>
          expect(err.message).toBe('Errore di rete — server non raggiungibile'),
      });
    });

    it('errore generico', () => {
      httpClientMock.delete.mockReturnValue(throwError(() => genericError));

      service.delete('x').subscribe({
        error: (err) =>
          expect(err.message).toBe('Errore 500: Server Explosion'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('handleError — extra checks', () => {
    it('ritorna sempre un Error', () => {
      httpClientMock.get.mockReturnValue(throwError(() => backendError));

      service.get('x').subscribe({
        error: (err) => expect(err).toBeInstanceOf(Error),
      });
    });

    it('non emette next in caso di errore', () => {
      let emitted = false;

      httpClientMock.get.mockReturnValue(throwError(() => genericError));

      service.get('x').subscribe({
        next: () => (emitted = true),
        error: () => expect(emitted).toBe(false),
      });
    });
  });
});
