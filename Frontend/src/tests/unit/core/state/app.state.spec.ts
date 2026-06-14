import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppState } from '@core/state/app.state';
import { User } from '@core/models/user.model';
import { Notification } from '@core/models/notification.model';

describe('AppState', () => {

  let state: AppState;

  beforeEach(() => {
    vi.useFakeTimers();
    state = new AppState();
  });

  describe('setUser', () => {
    it('deve impostare l’utente', () => {
      const user: User = { id: 1, username: 'A', email: 'a@a.com', iconId: 5 };

      state.setUser(user);

      expect(state.user()).toEqual(user);
      expect(state.isLoggedIn()).toBe(true);
    });

    it('deve fare logout se user è null', () => {
      state.setUser({ id: 1, username: 'A', email: 'a@a.com', iconId: 5 });

      state.setUser(null);

      expect(state.user()).toBeNull();
      expect(state.isLoggedIn()).toBe(false);
    });
  });

  describe('patchUser', () => {
    it('deve aggiornare solo i campi passati', () => {
      state.setUser({ id: 1, username: 'old', email: 'old@a.com', iconId: 1 });

      state.patchUser({ username: 'new' });

      expect(state.user()).toEqual({
        id: 1,
        username: 'new',
        email: 'old@a.com',
        iconId: 1
      });
    });

    it('non deve fare nulla se user = null', () => {
      state.patchUser({ username: 'new' });

      expect(state.user()).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('deve aggiornare loadingSignal', () => {
      expect(state.isLoading()).toBe(false);

      state.setLoading(true);

      expect(state.isLoading()).toBe(true);
    });
  });

  describe('setNotifications', () => {
    it('deve sostituire completamente la lista', () => {
      const list: Notification[] = [
        {
          id: 1, userId: 1, actorId: 2,
          targetType: 'restaurant',
          targetId: 99,
          type: 'upvote_restaurant',
          isRead: false,
          createdAt: new Date().toISOString(),
          reviewId: null,
          replyId: null,
          restaurantId: 99
        }
      ];

      state.setNotifications(list);

      expect(state.notifications()).toEqual(list);
      expect(state.unreadCount()).toBe(1);
    });
  });

  describe('addNotification', () => {
    it('deve aggiungere una nuova notifica e triggerare animazione', () => {
      const notif: Notification = {
        id: 1, userId: 1, actorId: 2,
        targetType: 'review',
        targetId: 50,
        type: 'reply',
        isRead: false,
        createdAt: new Date().toISOString(),   // nuova (<1 min)
        reviewId: 50,
        replyId: null,
        restaurantId: null
      };

      state.addNotification(notif);

      const stored = state.notifications()[0];

      expect(stored.id).toBe(1);
      expect(stored.isNew).toBe(true);

      // animazione: prima false, poi true dopo timeout(0)
      expect(state.bellAnimate()).toBe(false);
      vi.runAllTimers();
      expect(state.bellAnimate()).toBe(true);
    });

    it('deve marcare isNew = false se vecchia di oltre 1 min', () => {
      const oldDate = new Date(Date.now() - 120_000).toISOString(); // 2 minuti

      const notif: Notification = {
        id: 10, userId: 1, actorId: 3,
        targetType: 'restaurant',
        targetId: 1,
        type: 'downvote_restaurant',
        isRead: false,
        createdAt: oldDate,
        reviewId: null,
        replyId: null,
        restaurantId: 1
      };

      state.addNotification(notif);

      expect(state.notifications()[0].isNew).toBe(false);
    });
  });

  describe('markNotificationAsRead', () => {
    it('deve marcare solo la notifica specificata', () => {
      const list = [
        { id: 1, isRead: false },
        { id: 2, isRead: false }
      ].map(n => ({
        ...n,
        userId: 1,
        actorId: 2,
        targetType: 'review' as const,
        targetId: 1,
        type: 'reply' as const,
        createdAt: new Date().toISOString(),
        reviewId: 1,
        replyId: null,
        restaurantId: null
      }));

      state.setNotifications(list);

      state.markNotificationAsRead(1);

      expect(state.notifications()[0].isRead).toBe(true);
      expect(state.notifications()[1].isRead).toBe(false);
      expect(state.unreadCount()).toBe(1);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('deve marcare tutte come lette', () => {
      const list = [
        { id: 1, isRead: false },
        { id: 2, isRead: false }
      ].map(n => ({
        ...n,
        userId: 1,
        actorId: 2,
        targetType: 'review' as const,
        targetId: 1,
        type: 'reply' as const,
        createdAt: new Date().toISOString(),
        reviewId: 1,
        replyId: null,
        restaurantId: null
      }));

      state.setNotifications(list);

      state.markAllNotificationsAsRead();

      expect(state.notifications().every(n => n.isRead)).toBe(true);
      expect(state.unreadCount()).toBe(0);
    });
  });

  describe('removeNotification', () => {
    it('deve eliminare la notifica corretta', () => {
      const list = [
        { id: 1, isRead: false },
        { id: 2, isRead: false }
      ].map(n => ({
        ...n,
        userId: 1,
        actorId: 2,
        targetType: 'review' as const,
        targetId: 1,
        type: 'reply' as const,
        createdAt: new Date().toISOString(),
        reviewId: 1,
        replyId: null,
        restaurantId: null
      }));

      state.setNotifications(list);

      state.removeNotification(1);

      expect(state.notifications().length).toBe(1);
      expect(state.notifications()[0].id).toBe(2);
    });
  });

  describe('reset', () => {
    it('deve riportare tutto allo stato iniziale', () => {
      state.setUser({ id: 1, username: 'x', email: 'x@x.com', iconId: 3 });
      state.setLoading(true);
      state.setNotifications([]);

      state.reset();

      expect(state.user()).toBeNull();
      expect(state.isLoading()).toBe(false);
      expect(state.notifications()).toEqual([]);
    });
  });

});
