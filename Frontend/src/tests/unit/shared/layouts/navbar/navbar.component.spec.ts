import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    HostListener: () => () => {},
    Output: () => () => {},
    EventEmitter: class {
      emit = vi.fn();
    },
    inject: () => ({}),
  };
});

import { NavbarComponent } from '@shared/layouts/navbar/views/navbar.component';
import { CreatedRestaurantEvent } from '@features/restaurants/add-restaurant-modal/models/add-restaurant.model';

describe('NavbarComponent', () => {
  let component: NavbarComponent;

  let closeMenuMock: ReturnType<typeof vi.fn>;
  let logoutVmMock: ReturnType<typeof vi.fn>;
  let navigateMock: ReturnType<typeof vi.fn>;
  let authLogoutMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    closeMenuMock = vi.fn();
    logoutVmMock = vi.fn();
    navigateMock = vi.fn();
    authLogoutMock = vi.fn();

    component = new NavbarComponent();

    (component as any).router = {
      navigate: navigateMock,
    };

    (component as any).authService = {
      logout: authLogoutMock,
    };

    component.vm = {
      closeMenu: closeMenuMock,
      toggleMenu: vi.fn(),
      logout: logoutVmMock,
      state: vi.fn(() => ({
        isLoggedIn: true,
        hasNotifications: false,
        menuOpen: false,
      })),
    } as any;
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare correttamente il componente', () => {
      expect(component).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('onScroll (gestione ombra navbar)', () => {
    it("dovrebbe aggiungere l'ombra se lo scroll verticale è maggiore di 5px", () => {
      Object.defineProperty(window, 'scrollY', { value: 10, writable: true });

      component.onScroll();

      expect(component.hasShadow).toBe(true);
    });

    it("dovrebbe rimuovere l'ombra se lo scroll verticale è minore o uguale a 5px", () => {
      Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

      component.onScroll();

      expect(component.hasShadow).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('onClickOutside (chiusura menu mobile)', () => {
    it('dovrebbe chiudere il menu se il click avviene fuori dalle aree designate', () => {
      const target = document.createElement('div');
      vi.spyOn(target, 'closest').mockReturnValue(null);

      const event = { target } as unknown as Event;

      component.onClickOutside(event);

      expect(closeMenuMock).toHaveBeenCalled();
    });

    it("NON dovrebbe chiudere il menu se il click avviene all'interno del menu mobile", () => {
      const target = document.createElement('div');
      const menu = document.createElement('div');
      menu.classList.add('mobile-menu');

      vi.spyOn(target, 'closest').mockReturnValue(menu);

      component.onClickOutside({ target } as any);

      expect(closeMenuMock).not.toHaveBeenCalled();
    });

    it('NON dovrebbe chiudere il menu se il click avviene sul pulsante hamburger', () => {
      const target = document.createElement('div');
      const hamburger = document.createElement('button');
      hamburger.classList.add('hamburger-btn');

      vi.spyOn(target, 'closest').mockReturnValue(hamburger);

      component.onClickOutside({ target } as any);

      expect(closeMenuMock).not.toHaveBeenCalled();
    });

    it('NON dovrebbe chiudere il menu se il click avviene sul dropdown delle notifiche', () => {
      const target = document.createElement('div');
      const notifications = document.createElement('app-notification-dropdown');

      vi.spyOn(target, 'closest').mockReturnValue(notifications);

      component.onClickOutside({ target } as any);

      expect(closeMenuMock).not.toHaveBeenCalled();
    });

    it("dovrebbe ignorare l'evento se il target non è un elemento HTML", () => {
      const event = { target: {} } as unknown as Event;

      component.onClickOutside(event);

      expect(closeMenuMock).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Login', () => {
    it('openLogin dovrebbe emettere l\'evento "login" e chiudere il menu', () => {
      component.openLogin();

      expect(component.login.emit).toHaveBeenCalled();
      expect(closeMenuMock).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Logout', () => {
    it('onLogout dovrebbe eseguire il logout, chiudere il menu e reindirizzare alla home', () => {
      component.onLogout();

      expect(authLogoutMock).toHaveBeenCalled();
      expect(logoutVmMock).toHaveBeenCalled();
      expect(closeMenuMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith(['/']);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione Eventi', () => {
    it('onCreateRestaurant dovrebbe navigare alla pagina del nuovo ristorante creato', () => {
      const event: CreatedRestaurantEvent = {
        createdRestaurantId: 42,
      };

      component.onCreateRestaurant(event);

      expect(navigateMock).toHaveBeenCalledWith(['/restaurants', 42]);
    });
  });
});
