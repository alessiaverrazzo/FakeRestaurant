import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Input: () => () => {},
    Output: () => () => {},
    EventEmitter: class {
      emit = vi.fn();
    }
  };
});

// Mock viewmodel
function createVmMock() {
  return {
    init: vi.fn(),
    notification: { id: 123 } // default fittizio
  };
}

import { NotificationItemComponent } from '@features/notifications/notification-item/views/notification-item.component';
import { NotificationItem } from '@features/notifications/notification-item/models/notification-item.model';

describe('NotificationItemComponent', () => {

  let comp: NotificationItemComponent;
  let vm: any;

  beforeEach(() => {
    vm = createVmMock();

    comp = new NotificationItemComponent(vm);

    comp.delete = { emit: vi.fn() } as any;
    comp.clicked = { emit: vi.fn() } as any;
    comp.markAsRead = { emit: vi.fn() } as any;
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(comp).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('@Input() notification', () => {
    it('dovrebbe chiamare vm.init() quando il valore viene impostato', () => {
      const notif: NotificationItem = {
        id: 10,
        userId: 1,
        actorId: 2,
        targetType: 'review',
        targetId: 55,
        type: 'upvote_review',
        isRead: false,
        createdAt: new Date().toISOString(),
        actorUsername: 'Mario',
        reviewId: 55,
        replyId: null,
        restaurantId: null,
        isNew: true,
      };

      comp.notification = notif;

      expect(vm.init).toHaveBeenCalledTimes(1);
      expect(vm.init).toHaveBeenCalledWith(notif);
    });
  });

  // ----------------------------------------------------------------
  describe('onClick', () => {
    it("dovrebbe emettere l'evento \"clicked\" con la notifica corrente", () => {
      vm.notification = { id: 44 };

      comp.onClick();

      expect(comp.clicked.emit).toHaveBeenCalledTimes(1);
      expect(comp.clicked.emit).toHaveBeenCalledWith({ id: 44 });
    });
  });

  // ----------------------------------------------------------------
  describe('onDelete', () => {
    it("dovrebbe fermare la propagazione dell'evento ed emettere \"delete\" con l'id della notifica", () => {
      const fakeEvent = {
        stopPropagation: vi.fn(),
      } as any as MouseEvent;

      vm.notification = { id: 777 };

      comp.onDelete(fakeEvent);

      expect(fakeEvent.stopPropagation).toHaveBeenCalledTimes(1);
      expect(comp.delete.emit).toHaveBeenCalledTimes(1);
      expect(comp.delete.emit).toHaveBeenCalledWith(777);
    });
  });
});
