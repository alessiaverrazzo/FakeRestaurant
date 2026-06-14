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
    fn.update = (cb: any) => (value = cb(value));
    return fn;
  }

  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: mockSignal,
    computed: (fn: any) => fn
  };
});

import { RegisterViewModel } from '@features/auth/register/viewmodels/register.viewmodel';

// Mock AuthService
function createAuthMock() {
  return {
    register: vi.fn()
  };
}

describe('RegisterViewModel', () => {
  let vm: RegisterViewModel;
  let auth: any;

  beforeEach(() => {
    auth = createAuthMock();
    vm = new RegisterViewModel(auth);
  });

  // ----------------------------------------------------------------
  describe('Stato Iniziale', () => {
    it('dovrebbe avere uno stato iniziale corretto', () => {
      expect(vm.loading()).toBe(false);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.selectedIcon()).toBe(1);
      expect(vm.icons.length).toBe(15);
    });
  });

  // ----------------------------------------------------------------
  describe('selectIcon()', () => {
    it('dovrebbe aggiornare l\'icona selezionata', () => {
      vm.selectIcon(5);
      expect(vm.selectedIcon()).toBe(5);
    });
  });

  // ----------------------------------------------------------------
  describe('buildPayload()', () => {
    it('dovrebbe ritornare il payload corretto con i dati del form', () => {
      vm.form.setValue({
        username: 'aaa',
        email: 'bbb@mail.com',
        password: '12345678'
      });
      vm.selectIcon(8);

      const result = vm.buildPayload();

      expect(result).toEqual({
        username: 'aaa',
        email: 'bbb@mail.com',
        password: '12345678',
        icon_id: 8
      });
    });
  });

  // ----------------------------------------------------------------
  describe('register()', () => {
    it('dovrebbe ritornare true e non avere errori in caso di successo', async () => {
      auth.register.mockReturnValue(of({}));
      vm.form.setValue({ username: 'user', email: 'email@mail.com', password: '12345678' });

      const result = await vm.register();

      expect(result).toBe(true);
      expect(vm.errorMessage()).toBeNull();
      expect(vm.loading()).toBe(false);
      expect(auth.register).toHaveBeenCalledWith('user', 'email@mail.com', '12345678', 1);
    });

    it('dovrebbe impostare un errore sul campo email se l\'email è già in uso', async () => {
      auth.register.mockReturnValue(throwError(() => ({ error: { message: 'Email already in use' } })));
      vm.form.setValue({ username: 'u', email: 'e@mail', password: '12345678' });
      const spy = vi.spyOn(vm, 'setFieldError');

      const result = await vm.register();

      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith('email', 'Email già esistente');
    });

    it('dovrebbe impostare un errore sul campo username se l\'username è già in uso', async () => {
      auth.register.mockReturnValue(throwError(() => ({ error: { message: 'Username already exists' } })));
      vm.form.setValue({ username: 'u', email: 'e@mail', password: '12345678' });
      const spy = vi.spyOn(vm, 'setFieldError');

      const result = await vm.register();

      expect(result).toBe(false);
      expect(spy).toHaveBeenCalledWith('username', 'Username già esistente');
    });

    it('dovrebbe impostare un errore generico se l\'errore contiene err.message', async () => {
      auth.register.mockReturnValue(throwError(() => ({ message: 'Some error happened' })));
      vm.form.setValue({ username: 'u', email: 'e@mail', password: '12345678' });

      await vm.register();

      expect(vm.errorMessage()).toBe('Some error happened');
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe usare un messaggio di fallback se l\'errore non è strutturato', async () => {
      auth.register.mockReturnValue(throwError(() => ({})));
      vm.form.setValue({ username: 'u', email: 'e@mail', password: '12345678' });

      const result = await vm.register();

      expect(result).toBe(false);
      expect(vm.errorMessage()).toBe('Registrazione non riuscita');
      expect(vm.loading()).toBe(false);
    });

    it('dovrebbe gestire correttamente lo stato di loading (true → false)', async () => {
      auth.register.mockReturnValue(of({}));
      vm.form.setValue({ username: 'u', email: 'a@a.com', password: '12345678' });
      const loadingSpy = vi.spyOn(vm, 'setLoading');

      await vm.register();

      expect(loadingSpy).toHaveBeenCalledWith(true);
      expect(loadingSpy).toHaveBeenCalledWith(false);
    });
  });

  // ----------------------------------------------------------------
  describe('getErrorMessage()', () => {
    it('dovrebbe ritornare null se il controllo non esiste', () => {
      expect(vm.getErrorMessage('fakeControl')).toBeNull();
    });

    it('dovrebbe ritornare null se il controllo non ha errori', () => {
      vm.form.get('username')!.setErrors(null);
      expect(vm.getErrorMessage('username')).toBeNull();
    });

    it('dovrebbe ritornare "Campo obbligatorio" per l\'errore "required"', () => {
      vm.form.get('username')!.setErrors({ required: true });
      expect(vm.getErrorMessage('username')).toBe('Campo obbligatorio');
    });

    it('dovrebbe ritornare "Inserisci un’email valida" per l\'errore "email"', () => {
      vm.form.get('email')!.setErrors({ email: true });
      expect(vm.getErrorMessage('email')).toBe('Inserisci un’email valida');
    });

    it('dovrebbe ritornare "La password deve contenere almeno 8 caratteri" per l\'errore "minlength"', () => {
      vm.form.get('password')!.setErrors({ minlength: true });
      expect(vm.getErrorMessage('password')).toBe('La password deve contenere almeno 8 caratteri');
    });

    it('dovrebbe ritornare il messaggio per un errore custom', () => {
      vm.form.get('email')!.setErrors({ custom: 'Email già esistente' });
      expect(vm.getErrorMessage('email')).toBe('Email già esistente');
    });

    it('dovrebbe ritornare null se l\'errore non è gestito', () => {
      vm.form.get('email')!.setErrors({ otherError: true });
      expect(vm.getErrorMessage('email')).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('showError()', () => {
    it('dovrebbe ritornare false se il controllo non esiste', () => {
      expect(vm.showError('fake')).toBe(false);
    });

    it('dovrebbe ritornare false se il controllo non è "touched"', () => {
      const ctrl = vm.form.get('username')!;
      ctrl.markAsUntouched();
      ctrl.setErrors({ required: true });
      expect(vm.showError('username')).toBe(false);
    });

    it('dovrebbe ritornare false se il controllo è "touched" ma valido', () => {
      const ctrl = vm.form.get('username')!;
      ctrl.setErrors(null);
      ctrl.markAsTouched();
      expect(vm.showError('username')).toBe(false);
    });

    it('dovrebbe ritornare true se il controllo è "touched" e non valido', () => {
      const ctrl = vm.form.get('username')!;
      ctrl.setErrors({ required: true });
      ctrl.markAsTouched();
      expect(vm.showError('username')).toBe(true);
    });
  });
});
