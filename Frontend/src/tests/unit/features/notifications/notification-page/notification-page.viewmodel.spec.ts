import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

// Mock
let injectedServices: any = {};

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  function mockSignal(initial: any) {
    let value = initial;
    const fn: any = () => value;
    fn.set = (v: any) => (value = v);
    return fn;
  }

  return {
    ...actual,

    inject: (token: any) => {
      return injectedServices[token.name] ?? {};
    },

    signal: mockSignal,

    computed: (fn: any) => {
      const wrapper: any = () => fn();
      return wrapper;
    }
  };
});

import { NotificationPageViewModel } from '@features/notifications/notification-page/viewmodels/notification-page.viewmodel';

// Mock service
function createNotificationServiceMock() {
  return {
    getAll: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    delete: vi.fn()
  };
}

function createAppStateMock() {
  return {
    notifications: vi.fn().mockReturnValue([]),
    setNotifications: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn(),
    removeNotification: vi.fn()
  };
}

function createRouterMock() {
  return {
    navigate: vi.fn()
  };
}

describe('NotificationPageViewModel', () => {

  let vm: NotificationPageViewModel;
  let notificationService: any;
  let appState: any;
  let router: any;

  beforeEach(() => {
    notificationService = createNotificationServiceMock();
    appState = createAppStateMock();
    router = createRouterMock();

    injectedServices = {
      NotificationService: notificationService,
      AppState: appState,
      Router: router
    };

    vm = new NotificationPageViewModel();
  });

  // ----------------------------------------------------------------
  describe('loadFromBackend', () => {
    it("in caso di successo, dovrebbe mappare le notifiche, impostare 'isNew' e chiamare setNotifications", async () => {
      const now = Date.now();
      const recent = new Date(now - 30 * 1000).toISOString();
      const old = new Date(now - 120 * 1000).toISOString();

      const mockList = [
        { id: 1, createdAt: recent },
        { id: 2, createdAt: old },
      ];

      notificationService.getAll.mockReturnValue(of(mockList));

      await vm.loadFromBackend();

      expect(appState.setNotifications).toHaveBeenCalled();
      const passed = appState.setNotifications.mock.calls[0][0];

      expect(passed[0].isNew).toBe(true);
      expect(passed[1].isNew).toBe(false);
    });

    // ----------------------------------------------------------------
    it("in caso di errore, dovrebbe usare err.error.message se presente", async () => {
      notificationService.getAll.mockReturnValue(
        throwError(() => ({ error: { message: 'err1' } }))
      );

      await vm.loadFromBackend();

      expect(vm.errorMessage()).toBe('err1');
    });

    it("in caso di errore, dovrebbe usare err.message se err.error.message non è presente", async () => {
      notificationService.getAll.mockReturnValue(
        throwError(() => ({ message: 'err2' }))
      );

      await vm.loadFromBackend();

      expect(vm.errorMessage()).toBe('err2');
    });

    it("in caso di errore, dovrebbe usare un messaggio di fallback se non sono presenti messaggi di errore", async () => {
      notificationService.getAll.mockReturnValue(
        throwError(() => ({}))
      );

      await vm.loadFromBackend();

      expect(vm.errorMessage()).toBe('Impossibile caricare le notifiche.');
    });
  });

  // ----------------------------------------------------------------
  describe('handleClick', () => {
    it("dovrebbe navigare alla pagina del ristorante per una notifica di tipo 'upvote_restaurant'", () => {
      const n = { id: 1, type: 'upvote_restaurant', targetId: 99 };

      vm.handleClick(n as any);

      expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 99]);
    });

    it("dovrebbe navigare alla pagina del ristorante con highlight per una notifica di tipo 'upvote_review'", () => {
      const n = { id: 1, type: 'upvote_review', restaurantId: 7, targetId: 33 };

      vm.handleClick(n as any);

      expect(router.navigate).toHaveBeenCalledWith(
        ['/restaurants', 7],
        { queryParams: { highlightRootReviewId: 33, highlightReviewId: 33 } }
      );
    });

    it("dovrebbe navigare con highlight corretto per una notifica di tipo 'reply' quando reviewId è presente", () => {
      const n = {
        id: 1,
        type: 'reply',
        restaurantId: 5,
        targetId: 20,
        reviewId: 55,
      };

      vm.handleClick(n as any);

      expect(router.navigate).toHaveBeenCalledWith(
        ['/restaurants', 5],
        { queryParams: { highlightRootReviewId: 55, highlightReviewId: 20 } }
      );
    });

    it("dovrebbe navigare con highlight corretto per una notifica di tipo 'reply' usando targetId come fallback", () => {
      const n = {
        id: 1,
        type: 'reply',
        restaurantId: 5,
        targetId: 20,
        reviewId: undefined,
      };

      vm.handleClick(n as any);

      expect(router.navigate).toHaveBeenCalledWith(
        ['/restaurants', 5],
        { queryParams: { highlightRootReviewId: 20, highlightReviewId: 20 } }
      );
    });

    it("dovrebbe navigare alla pagina del ristorante con highlight per una notifica di tipo 'new_review'", () => {
      const n = {
        id: 1,
        type: 'new_review',
        restaurantId: 10,
        targetId: 50,
      };

      vm.handleClick(n as any);

      expect(router.navigate).toHaveBeenCalledWith(
        ['/restaurants', 10],
        { queryParams: { highlightRootReviewId: 50, highlightReviewId: 50 } }
      );
    });

    it("non dovrebbe navigare per un tipo di notifica non gestito", () => {
      const n = { id: 1, type: 'unknown' };

      vm.handleClick(n as any);

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('loadMore', () => {
    it("non dovrebbe fare nulla se il caricamento è già in corso", () => {
      vm.loading.set(true);

      vm.loadMore();

      expect(vm.loading()).toBe(true);
    });

    it("dovrebbe incrementare il numero di notifiche caricate dopo un timeout", () => {
      vi.useFakeTimers();
      const vmLocal = vm as any;

      vm.loading.set(false);

      vm.loadMore();
      expect(vm.loading()).toBe(true);

      vi.advanceTimersByTime(300);

      expect(vm.loading()).toBe(false);
      expect(vmLocal.loaded).toBe(20);
    });
  });

  // ----------------------------------------------------------------
  describe('markAsRead', () => {
    it("in caso di successo, dovrebbe chiamare appState.markNotificationAsRead", async () => {
      notificationService.markAsRead.mockReturnValue(of({}));

      await vm.markAsRead(123);

      expect(appState.markNotificationAsRead).toHaveBeenCalledWith(123);
    });

    it("non dovrebbe chiamare appState in caso di errore", async () => {
      notificationService.markAsRead.mockReturnValue(
        throwError(() => ({ message: 'x' }))
      );

      await vm.markAsRead(1);

      expect(appState.markNotificationAsRead).not.toHaveBeenCalled();
    });

    it("in caso di errore, dovrebbe loggare un messaggio di fallback", async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      notificationService.markAsRead.mockReturnValue(
        throwError(() => ({}))
      );

      await vm.markAsRead(5);

      expect(warn).toHaveBeenCalledWith(
        'Errore markAsRead:',
        'Si è verificato un errore.'
      );

      warn.mockRestore();
    });

    it("in caso di errore, dovrebbe loggare il messaggio da err.error.message", async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      notificationService.markAsRead.mockReturnValue(
        throwError(() => ({
          error: { message: 'ERR_NESTED_MARK' },
        }))
      );

      await vm.markAsRead(42);

      expect(warn).toHaveBeenCalledWith(
        'Errore markAsRead:',
        'ERR_NESTED_MARK'
      );

      expect(appState.markNotificationAsRead).not.toHaveBeenCalled();

      warn.mockRestore();
    });
  });

  // ----------------------------------------------------------------
  describe('markAllAsRead', () => {
    it("in caso di successo, dovrebbe chiamare markAllNotificationsAsRead", async () => {
      notificationService.markAllAsRead.mockReturnValue(of({}));

      await vm.markAllAsRead();

      expect(appState.markAllNotificationsAsRead).toHaveBeenCalled();
    });

    it("non dovrebbe chiamare appState in caso di errore", async () => {
      notificationService.markAllAsRead.mockReturnValue(
        throwError(() => ({ message: 'err' }))
      );

      await vm.markAllAsRead();

      expect(appState.markAllNotificationsAsRead).not.toHaveBeenCalled();
    });

    it("in caso di errore, dovrebbe loggare un messaggio di fallback", async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      notificationService.markAllAsRead.mockReturnValue(
        throwError(() => ({}))
      );

      await vm.markAllAsRead();

      expect(warn).toHaveBeenCalledWith(
        'Errore markAllAsRead:',
        'Si è verificato un errore.'
      );

      warn.mockRestore();
    });

    it("in caso di errore, dovrebbe loggare il messaggio da err.error.message", async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => { });

      notificationService.markAllAsRead.mockReturnValue(
        throwError(() => ({
          error: { message: 'ERR_NESTED_ALL' },
        }))
      );

      await vm.markAllAsRead();

      expect(warn).toHaveBeenCalledWith(
        'Errore markAllAsRead:',
        'ERR_NESTED_ALL'
      );

      expect(appState.markAllNotificationsAsRead).not.toHaveBeenCalled();

      warn.mockRestore();
    });
  });

  // ----------------------------------------------------------------
  describe('deleteNotification', () => {
    it("in caso di successo, dovrebbe chiamare removeNotification", async () => {
      notificationService.delete.mockReturnValue(of({}));

      await vm.deleteNotification(22);

      expect(appState.removeNotification).toHaveBeenCalledWith(22);
    });

    it("non dovrebbe chiamare appState in caso di errore", async () => {
      notificationService.delete.mockReturnValue(
        throwError(() => ({ message: 'err' }))
      );

      await vm.deleteNotification(2);

      expect(appState.removeNotification).not.toHaveBeenCalled();
    });

    it("dovrebbe gestire un errore con err.error.message", async () => {
      notificationService.delete.mockReturnValue(
        throwError(() => ({ error: { message: 'delete1' } }))
      );

      await vm.deleteNotification(10);

      expect(appState.removeNotification).not.toHaveBeenCalled();
    });

    it("dovrebbe gestire un errore con err.message", async () => {
      notificationService.delete.mockReturnValue(
        throwError(() => ({ message: 'delete2' }))
      );

      await vm.deleteNotification(10);

      expect(appState.removeNotification).not.toHaveBeenCalled();
    });

    it("dovrebbe gestire un errore con un messaggio di fallback", async () => {
      notificationService.delete.mockReturnValue(
        throwError(() => ({}))
      );

      await vm.deleteNotification(10);

      expect(appState.removeNotification).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('groupedNotifications', () => {
    it("dovrebbe raggruppare correttamente le notifiche per 'Oggi' e 'Ieri'", () => {
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);

      appState.notifications.mockReturnValue([
        { createdAt: now.toISOString(), id: 1 },
        { createdAt: yesterday.toISOString(), id: 2 },
      ]);

      const groups = vm.groupedNotifications();

      expect(groups['Oggi'].length).toBe(1);
      expect(groups['Ieri'].length).toBe(1);
    });

    it("dovrebbe raggruppare correttamente le notifiche per 'Questa settimana', 'Questo mese' e 'Più vecchie'", () => {
      const now = new Date();

      const sixDaysAgo = new Date(now);
      sixDaysAgo.setDate(now.getDate() - 6);

      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(now.getDate() - 20);

      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(now.getDate() - 60);

      appState.notifications.mockReturnValue([
        { createdAt: sixDaysAgo.toISOString(), id: 1 },
        { createdAt: twentyDaysAgo.toISOString(), id: 2 },
        { createdAt: sixtyDaysAgo.toISOString(), id: 3 },
      ]);

      const groups = vm.groupedNotifications();

      expect(groups['Questa settimana'].length).toBe(1);
      expect(groups['Questo mese'].length).toBe(1);
      expect(groups['Più vecchie'].length).toBe(1);
    });
  });
});
