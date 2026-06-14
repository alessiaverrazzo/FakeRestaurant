import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';

// Mock decoratori Angular
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Injectable: () => (cls: any) => cls,
    Output: () => () => {}
  };
});

import { PasswordResetRequestComponent } from '@features/auth/password-reset-request/views/password-reset-request.component';

// Mock segnali
function createSignalMock(initial: any) {
  let value = initial;
  const fn: any = () => value;
  fn.set = (v: any) => { value = v; };
  return fn;
}

// Mock viewmodel
function createVmMock() {
  return {
    loading: createSignalMock(false),
    errorMessage: createSignalMock(null),
    successMessage: createSignalMock(null),

    requestReset: vi.fn(),
    resetState: vi.fn()
  };
}

// Mock NgForm
function createFormMock({ valid }: { valid: boolean }) {
  return {
    invalid: !valid,
    control: {
      markAllAsTouched: vi.fn()
    }
  } as any;
}

describe('PasswordResetRequestComponent', () => {
  let component: PasswordResetRequestComponent;
  let vm: ReturnType<typeof createVmMock>;
  let closeSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();

    vm = createVmMock();

    closeSpy = vi.fn();

    component = new PasswordResetRequestComponent(vm as any);
    component.close.emit = closeSpy;
  });

  it('dovrebbe essere creato', () => {
    expect(component).toBeTruthy();
  });

  // ----------------------------------------------------------------
  describe('handleSubmit()', () => {
    it('dovrebbe marcare il form come toccato e non procedere se non è valido', async () => {
      const form = createFormMock({ valid: false });

      await component.handleSubmit(form);

      expect(form.control.markAllAsTouched).toHaveBeenCalled();
      expect(vm.requestReset).not.toHaveBeenCalled();
    });

    it('dovrebbe chiudere il modale dopo 3 secondi se la richiesta ha successo', async () => {
      const form = createFormMock({ valid: true });
      vm.requestReset.mockResolvedValue(true);
      const closeModalSpy = vi.spyOn(component, 'closeModal').mockImplementation(() => {});

      await component.handleSubmit(form);

      // prima del timeout non deve chiudere
      expect(closeModalSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);

      expect(closeModalSpy).toHaveBeenCalledTimes(1);
    });

    it('non dovrebbe chiudere il modale se la richiesta fallisce', async () => {
      const form = createFormMock({ valid: true });
      vm.requestReset.mockResolvedValue(false);
      const closeModalSpy = vi.spyOn(component, 'closeModal').mockImplementation(() => {});

      await component.handleSubmit(form);

      vi.advanceTimersByTime(3000);

      expect(closeModalSpy).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('onInputChange()', () => {
    it('dovrebbe chiamare resetState se esiste un messaggio di errore', () => {
      vm.errorMessage.set('errore');

      component.onInputChange();

      expect(vm.resetState).toHaveBeenCalledTimes(1);
    });

    it('dovrebbe chiamare resetState se esiste un messaggio di successo', () => {
      vm.successMessage.set('ok');

      component.onInputChange();

      expect(vm.resetState).toHaveBeenCalledTimes(1);
    });

    it('non dovrebbe chiamare resetState se non ci sono messaggi', () => {
      vm.errorMessage.set(null);
      vm.successMessage.set(null);

      component.onInputChange();

      expect(vm.resetState).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('closeModal()', () => {
    it('dovrebbe chiamare resetState ed emettere l\'evento close', () => {
      component.closeModal();

      expect(vm.resetState).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
