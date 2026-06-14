import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock decoratori Angular
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Injectable: () => (cls: any) => cls,
    Directive: () => (cls: any) => cls,
    Pipe: () => (cls: any) => cls,
    Input: () => () => {},
    Output: () => () => {},
  };
});

import { LoginComponent } from '@features/auth/login/views/login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let vmMock: any;

  beforeEach(() => {
    vmMock = {
      errorMessage: vi.fn(),
      clearError: vi.fn(),
      login: vi.fn(),
    };

    component = new LoginComponent(vmMock);
    component.close.emit = vi.fn();
    component.openRegister.emit = vi.fn();
    component.openPasswordResetRequest.emit = vi.fn();
  });

  // ----------------------------------------------------------------
  describe('onInputChange()', () => {
    it('non dovrebbe chiamare clearError se errorMessage è vuoto', () => {
      vmMock.errorMessage.mockReturnValue('');

      component.onInputChange();

      expect(vmMock.clearError).not.toHaveBeenCalled();
    });

    it('dovrebbe chiamare clearError se errorMessage ha contenuto', () => {
      vmMock.errorMessage.mockReturnValue('Errore');

      component.onInputChange();

      expect(vmMock.clearError).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  describe('handleLogin()', () => {
    it('dovrebbe chiamare vm.login con identifier e password trimmati', async () => {
      component.identifier = '  user  ';
      component.password = '  pass  ';

      vmMock.login.mockResolvedValue(false);

      await component.handleLogin();

      expect(vmMock.login).toHaveBeenCalledWith({
        identifier: 'user',
        password: 'pass'
      });
    });

    it('non dovrebbe emettere close se il login fallisce', async () => {
      vmMock.login.mockResolvedValue(false);

      await component.handleLogin();

      expect(component.close.emit).not.toHaveBeenCalled();
    });

    it('dovrebbe emettere close se il login ha successo', async () => {
      vmMock.login.mockResolvedValue(true);

      await component.handleLogin();

      expect(component.close.emit).toHaveBeenCalledTimes(1);
    });
  });
});
