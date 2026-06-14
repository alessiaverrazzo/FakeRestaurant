import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

// Mock Angular decorators
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: actual.signal
  };
});

import { PasswordResetViewModel } from '@features/auth/password-reset/viewmodels/password-reset.viewmodel';

describe('PasswordResetViewModel', () => {
  let vm: PasswordResetViewModel;
  let httpMock: any;

  beforeEach(() => {
    httpMock = {
      post: vi.fn(),
    };

    vm = new PasswordResetViewModel(httpMock);
  });

  // ----------------------------------------------------------------
  describe('clearState()', () => {
    it('dovrebbe resettare lo stato (loading, errorMessage, successMessage)', () => {
      vm.loading.set(true);
      vm.errorMessage.set('Errore!');
      vm.successMessage.set('Successo!');

      vm.clearState();

      expect(vm.loading()).toBe(false);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.successMessage()).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('resetPassword()', () => {
    it('dovrebbe chiamare http.post, impostare successMessage e ritornare true', async () => {
      httpMock.post.mockReturnValue(of({}));

      const result = await vm.resetPassword('abc', 'mypassword');

      expect(httpMock.post).toHaveBeenCalledWith('users/password-reset/reset', {
        token: 'abc',
        password: 'mypassword',
      });

      expect(result).toBe(true);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.successMessage()).toBe('✓ Password aggiornata con successo! 🎉');
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe usare err.error.message per il messaggio di errore', async () => {
      httpMock.post.mockReturnValue(
        throwError(() => ({ error: { message: 'Backend error' } }))
      );

      const result = await vm.resetPassword('abc', 'mypassword');

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Backend error');
      expect(vm.successMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe usare err.message se err.error.message non esiste', async () => {
      httpMock.post.mockReturnValue(
        throwError(() => ({ message: 'Generic error' }))
      );

      const result = await vm.resetPassword('abc', 'mypassword');

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Generic error');
      expect(vm.successMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe usare un messaggio di fallback se l\'errore non ha un messaggio', async () => {
      httpMock.post.mockReturnValue(throwError(() => ({})));

      const result = await vm.resetPassword('abc', 'mypassword');

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe(
        'Si è verificato un errore. Riprova più tardi.'
      );
      expect(vm.successMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
    });
  });
});
