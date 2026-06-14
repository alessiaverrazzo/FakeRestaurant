import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PasswordResetGuard } from '@core/guards/password-reset.guard';
import { HttpService } from '@core/services/http.service';

import { BrowserTestingModule } from '@angular/platform-browser/testing';
import { platformBrowserTesting } from '@angular/platform-browser/testing';

import { Observable, of, throwError, firstValueFrom, isObservable } from 'rxjs';

describe('PasswordResetGuard', () => {
  let httpMock: { get: ReturnType<typeof vi.fn> };
  let routerMock: { parseUrl: ReturnType<typeof vi.fn> };

  const mockState = { url: '/reset' } as any;

  beforeAll(() => {
    TestBed.initTestEnvironment(
      BrowserTestingModule,
      platformBrowserTesting()
    );
  });

  beforeEach(() => {
    httpMock = {
      get: vi.fn(),
    };

    routerMock = {
      parseUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpService, useValue: httpMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  function runGuard(route: any) {
    return TestBed.runInInjectionContext(() =>
      PasswordResetGuard(route, mockState)
    );
  }

  // Helper: risolve MaybeAsync
  async function resolveGuard(result: any) {
    return isObservable(result)
      ? await firstValueFrom(result)
      : result;
  }

  // ---------------------------------------------------------
  describe('Scenario: Token mancante', () => {
    it('dovrebbe reindirizzare con errore', async () => {
      const route = { params: {} };

      routerMock.parseUrl.mockReturnValue('/?invalidResetToken=1');

      const rawResult = runGuard(route);
      const result = await resolveGuard(rawResult);

      expect(result).toBe('/?invalidResetToken=1');
      expect(routerMock.parseUrl).toHaveBeenCalledWith('/?invalidResetToken=1');
      expect(httpMock.get).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------
  describe('Scenario: Token valido', () => {
    it('dovrebbe verificare il token e permettere l’accesso', async () => {
      const route = { params: { token: 'ABC123' } };

      httpMock.get.mockReturnValue(of(true));

      const rawResult = runGuard(route);
      const result = await resolveGuard(rawResult);

      expect(result).toBe(true);
      expect(httpMock.get).toHaveBeenCalledWith(
        'users/password-reset/verify/ABC123'
      );
      expect(routerMock.parseUrl).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------
  describe('Scenario: Token non valido (API error)', () => {
    it('dovrebbe reindirizzare con errore', async () => {
      const route = { params: { token: 'BADTOKEN' } };

      httpMock.get.mockReturnValue(throwError(() => new Error('Invalid')));
      routerMock.parseUrl.mockReturnValue('/?invalidResetToken=1');

      const rawResult = runGuard(route);
      const result = await resolveGuard(rawResult);

      expect(result).toBe('/?invalidResetToken=1');
      expect(httpMock.get).toHaveBeenCalledWith(
        'users/password-reset/verify/BADTOKEN'
      );
      expect(routerMock.parseUrl).toHaveBeenCalledWith('/?invalidResetToken=1');
    });
  });
});
