import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

// Mock decoratori Angular
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: actual.signal,
    computed: actual.computed
  };
});

import { LoginViewModel } from '@features/auth/login/viewmodels/login.viewmodel';

describe('LoginViewModel', () => {
  let vm: LoginViewModel;
  let authMock: any;

  beforeEach(() => {
    authMock = {
      login: vi.fn()
    };

    vm = new LoginViewModel(authMock);
  });

  // ----------------------------------------------------------------
  describe('Stato Iniziale', () => {
    it('dovrebbe avere loading a false e errorMessage a null', () => {
      expect(vm.loading()).toBe(false);
      expect(vm.errorMessage()).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('clearError()', () => {
    it('dovrebbe resettare errorMessage a null', () => {
      vm.setError('Errore');
      expect(vm.errorMessage()).toBe('Errore');

      vm.clearError();
      expect(vm.errorMessage()).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('setError()', () => {
    it('dovrebbe impostare il messaggio di errore', () => {
      vm.setError('Test');
      expect(vm.errorMessage()).toBe('Test');
    });
  });

  // ----------------------------------------------------------------
  describe('login()', () => {
    it('dovrebbe chiamare auth.login e ritornare true', async () => {
      authMock.login.mockReturnValue(of({}));

      const result = await vm.login({
        identifier: 'user',
        password: 'pass'
      });

      expect(authMock.login).toHaveBeenCalledWith('user', 'pass');
      expect(result).toBe(true);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe impostare errorMessage da err.error.message', async () => {
      authMock.login.mockReturnValue(
        throwError(() => ({ error: { message: 'Backend error' } }))
      );

      const result = await vm.login({
        identifier: 'user',
        password: 'pass'
      });

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Backend error');
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe impostare errorMessage da err.message', async () => {
      authMock.login.mockReturnValue(
        throwError(() => ({ message: 'Generic error' }))
      );

      const result = await vm.login({
        identifier: 'user',
        password: 'pass'
      });

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Generic error');
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe usare un messaggio di fallback se l\'errore non ha un messaggio', async () => {
      authMock.login.mockReturnValue(
        throwError(() => ({}))
      );

      const result = await vm.login({
        identifier: 'user',
        password: 'pass'
      });

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Errore sconosciuto');
      expect(vm.loading()).toBe(false);
    });
  });
});

