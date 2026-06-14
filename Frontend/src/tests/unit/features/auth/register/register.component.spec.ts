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

import { RegisterComponent } from '@features/auth/register/views/register.component';

// Mock viewmodel
function createVmMock() {
  const touched = { value: false };

  return {
    form: {
      invalid: true,
      markAllAsTouched: vi.fn(() => touched.value = true)
    },

    register: vi.fn(),

    // usato nella classe
    touchedState: touched
  };
}

describe('RegisterComponent', () => {

  let component: RegisterComponent;
  let vm: ReturnType<typeof createVmMock>;
  let closeSpy: any;

  beforeEach(() => {
    vm = createVmMock();

    component = new RegisterComponent(vm as any);

    // mockiamo emit
    closeSpy = vi.fn();
    component.close.emit = closeSpy;
  });

  it('dovrebbe essere creato', () => {
    expect(component).toBeTruthy();
  });

  // ----------------------------------------------------------------
  describe('handleRegister()', () => {
    it('dovrebbe marcare il form come toccato e non procedere se non è valido', async () => {
      vm.form.invalid = true;

      await component.handleRegister();

      expect(vm.form.markAllAsTouched).toHaveBeenCalled();
      expect(vm.register).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('non dovrebbe emettere close se la registrazione fallisce', async () => {
      vm.form.invalid = false;
      vm.register.mockResolvedValue(false);

      await component.handleRegister();

      expect(vm.register).toHaveBeenCalledOnce();
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('dovrebbe emettere close se la registrazione ha successo', async () => {
      vm.form.invalid = false;
      vm.register.mockResolvedValue(true);

      await component.handleRegister();

      expect(vm.register).toHaveBeenCalledOnce();
      expect(closeSpy).toHaveBeenCalledOnce();
    });

    it('non dovrebbe mai emettere l\'evento openLogin', async () => {
      vm.form.invalid = false;
      vm.register.mockResolvedValue(true);

      const spy = vi.spyOn(component.openLogin, 'emit');

      await component.handleRegister();

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
