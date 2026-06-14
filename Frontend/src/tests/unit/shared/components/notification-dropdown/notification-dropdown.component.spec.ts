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

import { NotificationDropdownComponent } from '@shared/components/notification-dropdown/views/notification-dropdown.component';

describe('NotificationDropdownComponent', () => {
  let component: NotificationDropdownComponent;

  // mock locali
  let closeDropdownMock: ReturnType<typeof vi.fn>;
  let toggleDropdownMock: ReturnType<typeof vi.fn>;
  let handleClickMock: ReturnType<typeof vi.fn>;
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    closeDropdownMock = vi.fn();
    toggleDropdownMock = vi.fn();
    handleClickMock = vi.fn();
    navigateMock = vi.fn();

    component = new NotificationDropdownComponent();

    // sostituisco Router (inject) con mock locale
    (component as any).router = { navigate: navigateMock };

    // sostituisco il VM reale con un mock
    component.vm = {
      isOpen: false,
      closeDropdown: closeDropdownMock,
      toggleDropdown: toggleDropdownMock,
      handleClick: handleClickMock,
    } as any;
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('onDocumentClick (HostListener)', () => {
    it('dovrebbe chiudere il dropdown se il click avviene fuori dal componente', () => {
      const fakeTarget = document.createElement('div');
      vi.spyOn(fakeTarget, 'closest').mockReturnValue(null);

      const event = { target: fakeTarget } as unknown as Event;

      component.onDocumentClick(event);

      expect(closeDropdownMock).toHaveBeenCalled();
    });

    it('non dovrebbe chiudere il dropdown se il click avviene dentro al componente', () => {
      const fakeTarget = document.createElement('div');
      const container = document.createElement('div');
      container.classList.add('notification-dropdown-container');

      vi.spyOn(fakeTarget, 'closest').mockReturnValue(container);

      const event = { target: fakeTarget } as unknown as Event;

      component.onDocumentClick(event);

      expect(closeDropdownMock).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('toggle', () => {
    it('dovrebbe delegare l\'apertura/chiusura al viewmodel', () => {
      component.toggle();

      expect(toggleDropdownMock).toHaveBeenCalled();
    });

    it("dovrebbe emettere 'openDropdown' se il dropdown viene aperto", () => {
      toggleDropdownMock.mockImplementation(() => {
        component.vm.isOpen = true;
      });

      component.toggle();

      expect(component.openDropdown.emit).toHaveBeenCalled();
    });

    it("non dovrebbe emettere 'openDropdown' se il dropdown rimane chiuso", () => {
      toggleDropdownMock.mockImplementation(() => {
        component.vm.isOpen = false;
      });

      component.toggle();

      expect(component.openDropdown.emit).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('onNotificationClick', () => {
    it('dovrebbe delegare la gestione del click al viewmodel', () => {
      const notification = { id: 123 } as any;

      component.onNotificationClick(notification);

      expect(handleClickMock).toHaveBeenCalledWith(
        notification,
        (component as any).router
      );
    });
  });

  // ----------------------------------------------------------------
  describe('goToNotifications', () => {
    it('dovrebbe fermare la propagazione, chiudere il dropdown e navigare alla pagina delle notifiche', () => {
      const stopPropagationMock = vi.fn();
      const event = { stopPropagation: stopPropagationMock } as any;

      component.goToNotifications(event);

      expect(stopPropagationMock).toHaveBeenCalled();
      expect(closeDropdownMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith(['/notifications']);
    });
  });
});
