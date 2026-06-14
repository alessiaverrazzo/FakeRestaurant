import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Angular decorators
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Injectable: () => (cls: any) => cls,
  };
});

// Mock Angular router & common
vi.mock('@angular/common', () => ({
  CommonModule: class {},
}));
vi.mock('@angular/forms', () => ({
  FormsModule: class {},
  NgForm: class {},
}));

import { PasswordResetComponent } from '@features/auth/password-reset/views/password-reset.component';

describe('PasswordResetComponent', () => {
  let component: PasswordResetComponent;
  let routeMock: any;
  let routerMock: any;
  let vmMock: any;

  beforeEach(() => {
    vi.useFakeTimers();

    routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn(),
        },
      },
    };

    routerMock = {
      navigate: vi.fn(),
    };

    vmMock = {
      errorMessage: {
        set: vi.fn(),
      },
      successMessage: vi.fn().mockReturnValue(null),
      loading: vi.fn().mockReturnValue(false),
      resetPassword: vi.fn(),
    };

    component = new PasswordResetComponent(
      routeMock as any,
      routerMock as any,
      vmMock as any
    );
  });

  // ----------------------------------------------------------------
  describe('ngOnInit()', () => {
    it('dovrebbe estrarre il token e non impostare errori se valido', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue('abc123');

      component.ngOnInit();

      expect(component.token).toBe('abc123');
      expect(vmMock.errorMessage.set).not.toHaveBeenCalled();
    });

    it('dovrebbe impostare un errore se il token è vuoto', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue('  ');

      component.ngOnInit();

      expect(vmMock.errorMessage.set).toHaveBeenCalledWith('Link non valido.');
    });

    it('dovrebbe impostare un errore se il token è nullo', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue(null);

      component.ngOnInit();

      expect(component.token).toBe('');
      expect(vmMock.errorMessage.set).toHaveBeenCalledWith('Link non valido.');
    });
  });

  // ----------------------------------------------------------------
  describe('handleSubmit()', () => {
    it('non dovrebbe procedere se il form non è valido', async () => {
      const form = { invalid: true } as any;

      await component.handleSubmit(form);

      expect(vmMock.resetPassword).not.toHaveBeenCalled();
      expect(vmMock.errorMessage.set).not.toHaveBeenCalled();
    });

    it('dovrebbe mostrare un errore se le password non coincidono', async () => {
      const form = { invalid: false } as any;

      component.password = 'abc';
      component.confirmPassword = 'xyz';

      await component.handleSubmit(form);

      expect(vmMock.errorMessage.set).toHaveBeenCalledWith('Le password non coincidono.');
      expect(vmMock.resetPassword).not.toHaveBeenCalled();
    });

    it('non dovrebbe reindirizzare se il reset della password fallisce', async () => {
      const form = { invalid: false } as any;
      component.password = 'abc';
      component.confirmPassword = 'abc';
      component.token = '123';
      vmMock.resetPassword.mockResolvedValue(false);

      await component.handleSubmit(form);

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('dovrebbe reindirizzare al login dopo 3000ms se il reset ha successo', async () => {
      const form = { invalid: false } as any;
      component.password = 'abc';
      component.confirmPassword = 'abc';
      component.token = '123';
      vmMock.resetPassword.mockResolvedValue(true);

      await component.handleSubmit(form);

      expect(routerMock.navigate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(3000);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/'], { state: { openLogin: true } });
    });
  });

  // ----------------------------------------------------------------
  describe('goToLogin()', () => {
    it('dovrebbe navigare alla home con la modale di login aperta', () => {
      component.goToLogin();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/'], { state: { openLogin: true } });
    });
  });
});
