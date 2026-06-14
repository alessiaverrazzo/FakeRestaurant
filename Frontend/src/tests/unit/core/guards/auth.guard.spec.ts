import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';
import { AuthService } from '@core/services/auth.service';

import { BrowserTestingModule } from '@angular/platform-browser/testing';
import { platformBrowserTesting } from '@angular/platform-browser/testing';

describe('AuthGuard', () => {
  let authServiceMock: {
    getToken: ReturnType<typeof vi.fn>;
    isTokenExpired: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  let routerMock: {
    parseUrl: ReturnType<typeof vi.fn>;
  };

  const mockRoute = {} as any
  const mockState = { url: '/test' } as any;

  beforeAll(() => {
    TestBed.initTestEnvironment(
      BrowserTestingModule,
      platformBrowserTesting()
    );
  });

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn(),
      isTokenExpired: vi.fn(),
      logout: vi.fn(),
    };

    routerMock = {
      parseUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  // Helper: esegue il guard nel contesto Angular
  function runGuard() {
    return TestBed.runInInjectionContext(() => AuthGuard(mockRoute, mockState));
  }

  // ----------------------------------------------------------------
  describe('Scenario: Nessun token presente', () => {
    it('dovrebbe bloccare l’accesso e reindirizzare', () => {
      authServiceMock.getToken.mockReturnValue(null);
      routerMock.parseUrl.mockReturnValue('/access-denied');

      const result = runGuard();

      expect(result).toBe('/access-denied');
      expect(routerMock.parseUrl).toHaveBeenCalledWith('/access-denied');
      expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Scenario: Token scaduto', () => {
    it('dovrebbe eseguire il logout e bloccare l’accesso', () => {
      authServiceMock.getToken.mockReturnValue('TOKEN');
      authServiceMock.isTokenExpired.mockReturnValue(true);
      routerMock.parseUrl.mockReturnValue('/access-denied');

      const result = runGuard();

      expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
      expect(routerMock.parseUrl).toHaveBeenCalledWith('/access-denied');
      expect(result).toBe('/access-denied');
    });
  });

  // ----------------------------------------------------------------
  describe('Scenario: Token valido', () => {
    it('dovrebbe consentire l’accesso', () => {
      authServiceMock.getToken.mockReturnValue('TOKEN');
      authServiceMock.isTokenExpired.mockReturnValue(false);

      const result = runGuard();

      expect(result).toBe(true);
      expect(authServiceMock.logout).not.toHaveBeenCalled();
      expect(routerMock.parseUrl).not.toHaveBeenCalled();
    });
  });

});
