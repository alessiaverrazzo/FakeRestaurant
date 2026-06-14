import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GuestGuard } from '@core/guards/guest.guard';
import { AuthService } from '@core/services/auth.service';

import { BrowserTestingModule } from '@angular/platform-browser/testing';
import { platformBrowserTesting } from '@angular/platform-browser/testing';

describe('GuestGuard', () => {
  let authServiceMock: {
    getToken: ReturnType<typeof vi.fn>;
    isTokenExpired: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
  };

  const mockRoute = {} as any;
  const mockState = { url: '/test' } as any;

  // Inizializzazione obbligatoria dell’ambiente Angular
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
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  // Helper: esegue il guard nel contesto di iniezione Angular
  function runGuard() {
    return TestBed.runInInjectionContext(() =>
      GuestGuard(mockRoute, mockState)
    );
  }

  describe('Scenario: Nessun token presente', () => {
    it('dovrebbe consentire l’accesso come guest', () => {
      authServiceMock.getToken.mockReturnValue(null);

      const result = runGuard();

      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
      expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Token scaduto', () => {
    it('dovrebbe eseguire il logout e permettere accesso come guest', () => {
      authServiceMock.getToken.mockReturnValue('TOKEN');
      authServiceMock.isTokenExpired.mockReturnValue(true);

      const result = runGuard();

      expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Scenario: Token valido (Utente già loggato)', () => {
    it('dovrebbe reindirizzare alla home', () => {
      authServiceMock.getToken.mockReturnValue('TOKEN');
      authServiceMock.isTokenExpired.mockReturnValue(false);

      const result = runGuard();

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
      expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
  });
});
