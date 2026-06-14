import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  function mockSignal(initial: any) {
    let value = initial;
    const fn: any = () => value;
    fn.set = (v: any) => (value = v);
    fn.update = (updater: (current: any) => any) => {
      value = updater(value);
    };
    return fn;
  }

  const mockInject = () => ({});

  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: mockSignal,
    inject: mockInject,
  };
});

import { EditProfileViewModel } from '@features/edit-profile/viewmodels/edit-profile.viewmodel';

// Mock dipendenze
function createUserServiceMock() {
  return {
    getMe: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  };
}

function createAppStateMock() {
  return {
    patchUser: vi.fn(),
    reset: vi.fn(),
  };
}

function createRouterMock() {
  return {
    navigate: vi.fn(),
  };
}

describe('EditProfileViewModel', () => {
  let vm: EditProfileViewModel;
  let userService: ReturnType<typeof createUserServiceMock>;
  let appState: ReturnType<typeof createAppStateMock>;
  let router: ReturnType<typeof createRouterMock>;

  beforeEach(() => {
    vi.useFakeTimers();

    userService = createUserServiceMock();
    appState = createAppStateMock();
    router = createRouterMock();

    vm = new EditProfileViewModel() as any;

    // Sovrascriviamo le dipendenze iniettate
    (vm as any).userService = userService;
    (vm as any).appState = appState;
    (vm as any).router = router;

    // mock locale di localStorage (sempre, per evitare problemi con JSDOM)
    (globalThis as any).localStorage = {
    removeItem: vi.fn(),
    };
  });

  // ----------------------------------------------------------------
  describe('Stato iniziale', () => {
    it('dovrebbe avere uno stato iniziale corretto', () => {
      const state = vm.state();
      expect(state.username).toBe('');
      expect(state.icon_id).toBe(1);
      expect(state.newPassword).toBeNull();
      expect(state.confirmPassword).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual([]);
      expect(state.success).toBeNull();
      expect(state.showDeleteModal).toBe(false);
      expect(state.deleteSuccess).toBe(false);
      expect(state.deleteLoading).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('reset', () => {
    it('dovrebbe pulire campi dinamici, errori, loading e success, ma non username e icona', () => {
      vm.state.update((s) => ({
        ...s,
        username: 'testuser',
        icon_id: 5,
        newPassword: 'abc',
        confirmPassword: 'def',
        loading: true,
        errors: ['errore'],
        success: 'ok',
      }));

      vm.reset();

      const state = vm.state();
      expect(state.username).toBe('testuser');
      expect(state.icon_id).toBe(5);
      expect(state.newPassword).toBeNull();
      expect(state.confirmPassword).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual([]);
      expect(state.success).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('loadUser', () => {
    it('in caso di successo, dovrebbe impostare initialState e aggiornare lo stato', () => {
      const mockUser = { username: 'alessia', iconId: 7 };
      userService.getMe.mockReturnValue(of(mockUser));

      vm.loadUser();

      const state = vm.state();
      expect(userService.getMe).toHaveBeenCalledTimes(1);
      expect(state.username).toBe('alessia');
      expect(state.icon_id).toBe(7);
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual([]);

      const initial = (vm as any).initialState;
      expect(initial).toEqual({ username: 'alessia', icon_id: 7 });
    });

    it('in caso di errore, dovrebbe usare err.error.message se presente', () => {
      userService.getMe.mockReturnValue(
        throwError(() => ({ error: { message: 'Backend getMe error' } })),
      );

      vm.loadUser();

      const state = vm.state();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual(['Backend getMe error']);
    });

    it('in caso di errore, dovrebbe usare err.message se err.error.message non è presente', () => {
      userService.getMe.mockReturnValue(
        throwError(() => ({ message: 'Generic getMe error' })),
      );

      vm.loadUser();

      const state = vm.state();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual(['Generic getMe error']);
    });

    it('in caso di errore, dovrebbe usare un messaggio di fallback se nessun messaggio di errore è presente', () => {
      userService.getMe.mockReturnValue(throwError(() => ({})));

      vm.loadUser();

      const state = vm.state();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual([
        'Si è verificato un errore. Riprova più tardi.',
      ]);
    });
  });

  // ----------------------------------------------------------------
  describe('validate', () => {
    it('non dovrebbe generare errori se non viene fornita una nuova password', () => {
      vm.state.update((s) => ({
        ...s,
        newPassword: null,
        confirmPassword: null,
        errors: ['vecchio'],
      }));

      (vm as any).validate();

      expect(vm.state().errors).toEqual([]);
    });

    it('dovrebbe generare un errore se la password è troppo corta', () => {
      vm.state.update((s) => ({
        ...s,
        newPassword: '1234567',
        confirmPassword: null,
        errors: [],
      }));

      (vm as any).validate();

      expect(vm.state().errors).toEqual([
        'La password deve contenere almeno 8 caratteri.',
      ]);
    });

    it('dovrebbe generare un errore se la password e la conferma non coincidono', () => {
      vm.state.update((s) => ({
        ...s,
        newPassword: '12345678',
        confirmPassword: 'abcdefgh',
        errors: [],
      }));

      (vm as any).validate();

      expect(vm.state().errors).toEqual(['Le password non coincidono.']);
    });

    it('dovrebbe generare due errori se la password è corta e la conferma non coincide', () => {
      vm.state.update((s) => ({
        ...s,
        newPassword: '1234',
        confirmPassword: 'abcd',
        errors: [],
      }));

      (vm as any).validate();

      expect(vm.state().errors).toContain(
        'La password deve contenere almeno 8 caratteri.',
      );
      expect(vm.state().errors).toContain('Le password non coincidono.');
      expect(vm.state().errors.length).toBe(2);
    });

    it('non dovrebbe generare errori se la password è valida e la conferma coincide', () => {
      vm.state.update((s) => ({
        ...s,
        newPassword: '12345678',
        confirmPassword: '12345678',
        errors: [],
      }));

      (vm as any).validate();

      expect(vm.state().errors).toEqual([]);
    });
  });

  // ----------------------------------------------------------------
  describe('updateField', () => {
    it('dovrebbe applicare trim al valore di username e resettare il messaggio di successo', () => {
      vm.state.update((s) => ({
        ...s,
        username: '',
        success: 'OK',
      }));

      vm.updateField('username', '  nuovoUser  ' as any);

      const state = vm.state();
      expect(state.username).toBe('nuovoUser');
      expect(state.success).toBeNull();
    });

    it('non dovrebbe applicare trim a campi diversi da username e resettare il messaggio di successo', () => {
      vm.state.update((s) => ({
        ...s,
        icon_id: 1,
        success: 'OK',
      }));

      vm.updateField('icon_id', 10 as any);

      const state = vm.state();
      expect(state.icon_id).toBe(10);
      expect(state.success).toBeNull();
    });

    it('dovrebbe chiamare validate e generare errori se la nuova password è troppo corta', () => {
      vm.state.update((s) => ({
        ...s,
        errors: [],
      }));

      vm.updateField('newPassword', '1234' as any);

      expect(vm.state().errors.length).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------
  describe('submit', () => {
    it('non dovrebbe chiamare updateUser se sono presenti errori di validazione', () => {
      vm.state.update((s) => ({
        ...s,
        username: 'user',
        icon_id: 2,
        newPassword: '123', // farà scattare validate con errore
        confirmPassword: null,
        errors: [],
      }));

      vm.submit();

      expect(userService.updateUser).not.toHaveBeenCalled();
      expect(vm.state().loading).toBe(false);
    });

    it('in caso di successo senza nuova password, dovrebbe chiamare updateUser con password undefined', () => {
      vm.state.update((s) => ({
        ...s,
        username: 'user',
        icon_id: 3,
        newPassword: null,
        confirmPassword: null,
        errors: [],
      }));

      const updatedUser = { username: 'userAgg', iconId: 5 };
      userService.updateUser.mockReturnValue(of(updatedUser));

      vm.submit();

      expect(userService.updateUser).toHaveBeenCalledWith({
        username: 'user',
        icon_id: 3,
        password: undefined,
      });

      const state = vm.state();
      expect(state.loading).toBe(false);
      expect(state.success).toBe('Modifiche salvate con successo!');

      expect(appState.patchUser).toHaveBeenCalledWith({
        username: 'userAgg',
        iconId: 5,
      });

      expect(router.navigate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1200);
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    });

    it('in caso di successo con nuova password, dovrebbe chiamare updateUser con la password fornita', () => {
      vm.state.update((s) => ({
        ...s,
        username: 'user',
        icon_id: 4,
        newPassword: '12345678',
        confirmPassword: '12345678',
        errors: [],
      }));

      const updatedUser = { username: 'userNew', iconId: 9 };
      userService.updateUser.mockReturnValue(of(updatedUser));

      vm.submit();

      expect(userService.updateUser).toHaveBeenCalledWith({
        username: 'user',
        icon_id: 4,
        password: '12345678',
      });

      expect(appState.patchUser).toHaveBeenCalledWith({
        username: 'userNew',
        iconId: 9,
      });
    });

    it('in caso di errore, dovrebbe usare err.backend.message se presente', () => {
      vm.state.update((s) => ({
        ...s,
        username: 'user',
        icon_id: 1,
        newPassword: null,
        confirmPassword: null,
        errors: [],
      }));

      userService.updateUser.mockReturnValue(
        throwError(() => ({ backend: { message: 'Backend update error' } })),
      );

      vm.submit();

      const state = vm.state();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual(['Backend update error']);
    });

    it('in caso di errore, dovrebbe usare err.message se err.backend.message non è presente', () => {
      vm.state.update((s) => ({
        ...s,
        username: 'user',
        icon_id: 1,
        newPassword: null,
        confirmPassword: null,
        errors: [],
      }));

      userService.updateUser.mockReturnValue(
        throwError(() => ({ message: 'Generic update error' })),
      );

      vm.submit();

      const state = vm.state();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual(['Generic update error']);
    });

    it('in caso di errore, dovrebbe usare un messaggio di fallback se nessun messaggio di errore è presente', () => {
      vm.state.update((s) => ({
        ...s,
        username: 'user',
        icon_id: 1,
        newPassword: null,
        confirmPassword: null,
        errors: [],
      }));

      userService.updateUser.mockReturnValue(throwError(() => ({})));

      vm.submit();

      const state = vm.state();
      expect(state.loading).toBe(false);
      expect(state.errors).toEqual([
        'Si è verificato un errore. Riprova più tardi.',
      ]);
    });
  });

  // ----------------------------------------------------------------
  describe('cancelChanges', () => {
    it('dovrebbe ripristinare initialState e resettare password, errori e messaggio di successo', () => {
      (vm as any).initialState = { username: 'orig', icon_id: 2 };

      vm.state.update((s) => ({
        ...s,
        username: 'mod',
        icon_id: 9,
        newPassword: '123',
        confirmPassword: '321',
        errors: ['e1'],
        success: 'ok',
      }));

      vm.cancelChanges();

      const state = vm.state();
      expect(state.username).toBe('orig');
      expect(state.icon_id).toBe(2);
      expect(state.newPassword).toBeNull();
      expect(state.confirmPassword).toBeNull();
      expect(state.errors).toEqual([]);
      expect(state.success).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('openDeleteModal', () => {
    it('dovrebbe impostare showDeleteModal a true', () => {
      vm.openDeleteModal();
      expect(vm.state().showDeleteModal).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('closeDeleteModal', () => {
    it('dovrebbe impostare showDeleteModal a false', () => {
      vm.state.update((s) => ({ ...s, showDeleteModal: true }));
      vm.closeDeleteModal();
      expect(vm.state().showDeleteModal).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('confirmDeleteAccount', () => {
    it("in caso di successo, dovrebbe impostare deleteSuccess, resettare lo stato dell'app, effettuare il logout e reindirizzare", () => {
      (globalThis as any).localStorage = { removeItem: vi.fn() };

      userService.deleteUser.mockReturnValue(of({}));

      vm.confirmDeleteAccount();

      const state = vm.state();
      expect(state.deleteLoading).toBe(false);
      expect(state.deleteSuccess).toBe(true);

      expect(appState.reset).toHaveBeenCalledTimes(1);
      expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith(
        'auth_token',
      );

      expect(router.navigate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1200);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('in caso di errore, dovrebbe usare err.error.message se presente', () => {
      userService.deleteUser.mockReturnValue(
        throwError(() => ({ error: { message: 'Delete backend error' } })),
      );

      vm.confirmDeleteAccount();

      const state = vm.state();
      expect(state.deleteLoading).toBe(false);
      expect(state.deleteSuccess).toBe(false);
      expect(state.errors).toEqual(['Delete backend error']);
      expect(appState.reset).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('in caso di errore, dovrebbe usare err.message se err.error.message non è presente', () => {
      userService.deleteUser.mockReturnValue(
        throwError(() => ({ message: 'Delete generic error' })),
      );

      vm.confirmDeleteAccount();

      const state = vm.state();
      expect(state.deleteLoading).toBe(false);
      expect(state.deleteSuccess).toBe(false);
      expect(state.errors).toEqual(['Delete generic error']);
    });

    it('in caso di errore, dovrebbe usare un messaggio di fallback se nessun messaggio di errore è presente', () => {
      userService.deleteUser.mockReturnValue(throwError(() => ({})));

      vm.confirmDeleteAccount();

      const state = vm.state();
      expect(state.deleteLoading).toBe(false);
      expect(state.deleteSuccess).toBe(false);
      expect(state.errors).toEqual([
        "Errore durante l'eliminazione dell'account.",
      ]);
    });
  });
});
