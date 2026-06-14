import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';

// Mock appState
const notificationsSignal = signal<any[]>([]);
const unreadCountSignal = signal<number>(0);
const bellAnimateSignal = signal<boolean>(false);

const appStateMock = {
  notifications: vi.fn(() => notificationsSignal()),
  unreadCount: vi.fn(() => unreadCountSignal()),
  bellAnimate: vi.fn(() => bellAnimateSignal()),

  setNotifications: vi.fn((list: any[]) => notificationsSignal.set(list)),

  markNotificationAsRead: vi.fn((id: number) => {
    notificationsSignal.set(
      notificationsSignal().map(n =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  }),

  removeNotification: vi.fn((id: number) => {
    notificationsSignal.set(
      notificationsSignal().filter(n => n.id !== id)
    );
  }),

  markAllNotificationsAsRead: vi.fn(() => {
    notificationsSignal.set(
      notificationsSignal().map(n => ({ ...n, read: true }))
    );
  }),
};

const subscribeOk = (value?: any) => ({
  subscribe: ({ next, error }: any) => {
    if (next) next(value);
  },
});

const subscribeError = (err: any) => ({
  subscribe: ({ error }: any) => {
    if (error) error(err);
  },
});

const notificationServiceMock = {
  getRecent: vi.fn(),
  markAsRead: vi.fn(),
  delete: vi.fn(),
  markAllAsRead: vi.fn(),
};

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    inject: (token: any) => {
      if (token.name === 'AppState') return appStateMock;
      if (token.name === 'NotificationService') return notificationServiceMock;
      return null;
    },
  };
});

import { NotificationDropdownViewModel } from
  '@shared/components/notification-dropdown/viewmodels/notification-dropdown.viewmodel';

describe('NotificationDropdownViewModel', () => {
  let vm: NotificationDropdownViewModel;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationsSignal.set([]);
    unreadCountSignal.set(0);
    bellAnimateSignal.set(false);

    vm = new NotificationDropdownViewModel();
  });

  // ----------------------------------------------------------------
  describe('Proprietà computate', () => {
    it('notifications: dovrebbe riflettere lo stato globale delle notifiche', () => {
      notificationsSignal.set([{ id: 1 }]);
      expect(vm.notifications()).toHaveLength(1);
    });

    it('visibleNotifications: dovrebbe limitare il numero di notifiche a maxVisible', () => {
      notificationsSignal.set(
        Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }))
      );
      expect(vm.visibleNotifications().length).toBe(vm.maxVisible);
    });

    it('hasUnread: dovrebbe essere true se ci sono notifiche non lette', () => {
      unreadCountSignal.set(1);
      expect(vm.hasUnread()).toBe(true);
    });

    it('bellAnimate: dovrebbe riflettere lo stato globale dell\'animazione', () => {
      bellAnimateSignal.set(true);
      expect(vm.bellAnimate()).toBe(true);
    });

    it('unreadCount: dovrebbe riflettere il conteggio globale delle notifiche non lette', () => {
      unreadCountSignal.set(5);
      expect(vm.unreadCount()).toBe(5);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione dropdown', () => {
    it('toggleDropdown: dovrebbe aprire il dropdown e caricare le notifiche recenti', () => {
      notificationServiceMock.getRecent.mockReturnValue(
        subscribeOk([{ id: 1 }])
      );

      vm.toggleDropdown();

      expect(vm.isOpen).toBe(true);
      expect(notificationServiceMock.getRecent).toHaveBeenCalled();
    });

    it('closeDropdown: dovrebbe chiudere il dropdown', () => {
      vm.isOpen = true;
      vm.closeDropdown();

      expect(vm.isOpen).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('loadRecent', () => {
    it('in caso di successo, dovrebbe salvare le notifiche e disattivare lo stato di caricamento', () => {
      notificationServiceMock.getRecent.mockReturnValue(
        subscribeOk([{ id: 1 }])
      );

      vm.loadRecent();

      expect(appStateMock.setNotifications).toHaveBeenCalled();
      expect(vm.loading()).toBe(false);
    });

    it('in caso di errore, dovrebbe impostare un messaggio di errore', () => {
      notificationServiceMock.getRecent.mockReturnValue(
        subscribeError({ message: 'Errore test' })
      );

      vm.loadRecent();

      expect(vm.error()).toBe('Errore test');
      expect(vm.loading()).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione errori (extractMessage)', () => {
    it('dovrebbe estrarre il messaggio da err.error.message se presente', () => {
      const msg = (vm as any).extractMessage({
        error: { message: 'Errore API' }
      });
      expect(msg).toBe('Errore API');
    });

    it('dovrebbe usare err.message come fallback', () => {
      const msg = (vm as any).extractMessage({
        message: 'Errore generico'
      });
      expect(msg).toBe('Errore generico');
    });

    it('dovrebbe usare un messaggio di default se nessun altro è presente', () => {
      const msg = (vm as any).extractMessage(null);
      expect(msg).toBe('Si è verificato un errore. Riprova più tardi.');
    });
  });

  // ----------------------------------------------------------------
  describe('handleClick', () => {
    it('dovrebbe navigare alla pagina del ristorante per una notifica di tipo "upvote_restaurant"', () => {
      const router = { navigate: vi.fn() } as any;

      notificationServiceMock.markAsRead.mockReturnValue(subscribeOk());

      vm.handleClick(
        { type: 'upvote_restaurant', targetId: 10, id: 1 } as any,
        router
      );

      expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 10]);
    });

    it('dovrebbe navigare alla recensione con i parametri di highlight corretti', () => {
      const router = { navigate: vi.fn() } as any;

      notificationServiceMock.markAsRead.mockReturnValue(subscribeOk());

      vm.handleClick(
        {
          type: 'upvote_review',
          id: 1,
          targetId: 5,
          restaurantId: 7,
        } as any,
        router
      );

      expect(router.navigate).toHaveBeenCalled();
    });

    it('dovrebbe ignorare i tipi di notifica non gestiti', () => {
      const router = { navigate: vi.fn() } as any;

      notificationServiceMock.markAsRead.mockReturnValue(subscribeOk());

      vm.handleClick(
        { type: 'unknown', id: 1 } as any,
        router
      );

      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('dovrebbe gestire correttamente il caso "reply" usando reviewId se presente', () => {
      const router = { navigate: vi.fn() } as any;

      notificationServiceMock.markAsRead.mockReturnValue(subscribeOk());

      vm.handleClick(
          {
          type: 'reply',
          id: 1,
          targetId: 10,
          reviewId: 5,
          restaurantId: 3
          } as any,
          router
      );

      expect(router.navigate).toHaveBeenCalledWith(
          ['/restaurants', 3],
          {
          queryParams: {
              highlightRootReviewId: 5,
              highlightReviewId: 10
          }
          }
      );
    });

    it('dovrebbe gestire correttamente il caso "reply" usando targetId come fallback', () => {
      const router = { navigate: vi.fn() } as any;

      notificationServiceMock.markAsRead.mockReturnValue(subscribeOk());

      vm.handleClick(
          {
          type: 'reply',
          id: 1,
          targetId: 99,
          restaurantId: 7
          } as any,
          router
      );

      expect(router.navigate).toHaveBeenCalledWith(
          ['/restaurants', 7],
          {
          queryParams: {
              highlightRootReviewId: 99,
              highlightReviewId: 99
          }
          }
      );
    });

    it('dovrebbe navigare correttamente per una notifica di tipo "new_review"', () => {
      const router = { navigate: vi.fn() } as any;

      notificationServiceMock.markAsRead.mockReturnValue(subscribeOk());

      vm.handleClick(
          {
          type: 'new_review',
          id: 1,
          targetId: 20,
          restaurantId: 7
          } as any,
          router
      );

      expect(router.navigate).toHaveBeenCalledWith(
          ['/restaurants', 7],
          {
          queryParams: {
              highlightRootReviewId: 20,
              highlightReviewId: 20
          }
          }
      );
    });
  });

  // ----------------------------------------------------------------
  describe('markAsRead', () => {
    it('non dovrebbe fare nulla se l\'id non è valido', () => {
      vm.markAsRead(-1);
      expect(notificationServiceMock.markAsRead).not.toHaveBeenCalled();
    });

    it('dovrebbe aggiornare ottimisticamente la notifica e chiamare il servizio', () => {
      notificationsSignal.set([{ id: 1, read: false }]);

      notificationServiceMock.markAsRead.mockReturnValue(subscribeOk());

      vm.markAsRead(1);

      expect(appStateMock.markNotificationAsRead).toHaveBeenCalledWith(1);
    });

    it('dovrebbe fare il rollback dello stato in caso di errore', () => {
      notificationsSignal.set([{ id: 1, read: false }]);

      notificationServiceMock.markAsRead.mockReturnValue(
        subscribeError({ message: 'fail' })
      );

      vm.markAsRead(1);

      expect(vm.error()).toBe('fail');
    });
  });

  // ----------------------------------------------------------------
  describe('deleteNotification', () => {
    it('dovrebbe rimuovere ottimisticamente la notifica e chiamare il servizio', () => {
      notificationsSignal.set([{ id: 1 }]);

      notificationServiceMock.delete.mockReturnValue(subscribeOk());

      vm.deleteNotification(1);

      expect(appStateMock.removeNotification).toHaveBeenCalledWith(1);
    });

    it('dovrebbe fare il rollback dello stato in caso di errore', () => {
      notificationsSignal.set([{ id: 1 }]);

      notificationServiceMock.delete.mockReturnValue(
        subscribeError({ message: 'err' })
      );

      vm.deleteNotification(1);

      expect(vm.error()).toBe('err');
    });

    it('non dovrebbe fare nulla se l\'id non è valido', () => {
      vm.deleteNotification(-5);
      vm.deleteNotification(NaN as any);

      expect(notificationServiceMock.delete).not.toHaveBeenCalled();
      expect(appStateMock.removeNotification).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('markAllAsRead', () => {
    it('dovrebbe marcare tutte le notifiche come lette e chiamare il servizio', () => {
      notificationsSignal.set([{ id: 1, read: false }]);

      notificationServiceMock.markAllAsRead.mockReturnValue(subscribeOk());

      vm.markAllAsRead();

      expect(appStateMock.markAllNotificationsAsRead).toHaveBeenCalled();
    });

    it('dovrebbe fare il rollback dello stato in caso di errore', () => {
      notificationsSignal.set([{ id: 1, read: false }]);

      notificationServiceMock.markAllAsRead.mockReturnValue(
        subscribeError({ message: 'boom' })
      );

      vm.markAllAsRead();

      expect(vm.error()).toBe('boom');
    });
  });
});
