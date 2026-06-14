import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

// Mock decoratori Angular
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  function mockSignal(initial: any) {
    let value = initial;
    const fn: any = () => value;
    fn.set = (v: any) => (value = v);
    return fn;
  }

  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: mockSignal
  };
});

import { PasswordResetRequestViewModel } from '@features/auth/password-reset-request/viewmodels/password-reset-request.viewmodel';

// Mock HttpService
function createHttpMock() {
  return {
    post: vi.fn()
  };
}

describe('PasswordResetRequestViewModel', () => {
  let vm: PasswordResetRequestViewModel;
  let http: any;

  beforeEach(() => {
    http = createHttpMock();
    vm = new PasswordResetRequestViewModel(http);
  });

  // ----------------------------------------------------------------
  describe('Stato Iniziale', () => {
    it('dovrebbe avere uno stato iniziale corretto', () => {
      expect(vm.loading()).toBe(false);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.successMessage()).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('resetState()', () => {
    it('dovrebbe resettare tutti i messaggi e lo stato di loading', () => {
      vm.loading.set(true);
      vm.errorMessage.set('err');
      vm.successMessage.set('ok');

      vm.resetState();

      expect(vm.loading()).toBe(false);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.successMessage()).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('requestReset()', () => {
    it('dovrebbe impostare il messaggio di successo e ritornare true se la richiesta va a buon fine', async () => {
      http.post.mockReturnValue(of({}));

      const result = await vm.requestReset('test@mail.com');

      expect(result).toBe(true);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.successMessage()).toBe(
        'Se l’utente esiste, riceverai una mail per reimpostare la password.'
      );
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe impostare il messaggio di errore da err.error.message e ritornare false', async () => {
      http.post.mockReturnValue(
        throwError(() => ({ error: { message: 'Backend error' } }))
      );

      const result = await vm.requestReset('x@y.com');

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Backend error');
      expect(vm.successMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe impostare il messaggio di errore da err.message e ritornare false', async () => {
      http.post.mockReturnValue(
        throwError(() => ({ message: 'Generic error' }))
      );

      const result = await vm.requestReset('x@y.com');

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Generic error');
      expect(vm.successMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe usare un messaggio di fallback e ritornare false se l\'errore non è strutturato', async () => {
      http.post.mockReturnValue(throwError(() => ({})));

      const result = await vm.requestReset('x@y.com');

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe(
        'Si è verificato un errore. Riprova più tardi.'
      );
      expect(vm.successMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
    });
  });
});
