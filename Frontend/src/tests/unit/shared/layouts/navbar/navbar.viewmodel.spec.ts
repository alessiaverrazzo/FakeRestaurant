import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: actual.signal,
    computed: actual.computed,
    inject: () => ({}),
  };
});

import { NavbarViewModel } from '@shared/layouts/navbar/viewmodels/navbar.viewmodel';

describe('NavbarViewModel', () => {
  let vm: NavbarViewModel;

  let appStateMock: {
    isLoggedIn: ReturnType<typeof vi.fn>;
    unreadCount: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    appStateMock = {
      isLoggedIn: vi.fn(),
      unreadCount: vi.fn(),
    };

    vi.mocked((vm as any)?.appState);

    vm = new NavbarViewModel();

    (vm as any).appState = appStateMock;
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare correttamente il viewmodel', () => {
      expect(vm).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('Stato (isLoggedIn, hasNotifications, menuOpen)', () => {
    it('dovrebbe riflettere correttamente lo stato di login, notifiche e menu', () => {
      appStateMock.isLoggedIn.mockReturnValue(true);
      appStateMock.unreadCount.mockReturnValue(3);

      vm.toggleMenu();

      const state = vm.state();

      expect(state.isLoggedIn).toBe(true);
      expect(state.hasNotifications).toBe(true);
      expect(state.menuOpen).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione Menu', () => {
    it('toggleMenu dovrebbe alternare lo stato di apertura del menu', () => {
      expect(vm.state().menuOpen).toBe(false);

      vm.toggleMenu();
      expect(vm.state().menuOpen).toBe(true);

      vm.toggleMenu();
      expect(vm.state().menuOpen).toBe(false);
    });

    it('closeMenu dovrebbe impostare lo stato del menu su chiuso', () => {
      vm.toggleMenu();
      vm.closeMenu();

      expect(vm.state().menuOpen).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('Logout', () => {
    it('dovrebbe chiudere il menu quando viene eseguito il logout', () => {
      vm.toggleMenu();
      vm.logout();
      expect(vm.state().menuOpen).toBe(false);
    });
  });
});
