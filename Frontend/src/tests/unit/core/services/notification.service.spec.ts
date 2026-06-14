import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import type { Notification, NotificationType } from '@core/models/notification.model';

// Mock HttpService
type HttpServiceMock = {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('NotificationService — test completi', () => {
  let service: NotificationService;
  let http: HttpServiceMock;

  beforeEach(() => {
    http = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    service = new NotificationService(http as any);
  });

  // ----------------------------------------------------------------
  describe('validateId', () => {
    it('accetta interi positivi', () => {
      expect(() => (service as any).validateId(1)).not.toThrow();
      expect(() => (service as any).validateId(42)).not.toThrow();
    });

    it('rifiuta null e undefined', () => {
      expect(() => (service as any).validateId(null)).toThrow('ID non valido');
      expect(() => (service as any).validateId(undefined)).toThrow('ID non valido');
    });

    it('rifiuta 0, negativi e non-interi', () => {
      const invalid: any[] = [0, -1, -10, 3.14, NaN];

      invalid.forEach(v => {
        expect(() => (service as any).validateId(v)).toThrow('ID non valido');
      });
    });

    it('converte valori numerici validi (come stringa) in numero', () => {
      expect(() => (service as any).validateId('5')).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  describe('mapNotificationType', () => {
    it('mappa correttamente upvote per restaurant e review', () => {
      const fn = (service as any).mapNotificationType.bind(service);

      const r1: NotificationType = fn('upvote', 'restaurant');
      const r2: NotificationType = fn('upvote', 'review');

      expect(r1).toBe('upvote_restaurant');
      expect(r2).toBe('upvote_review');
    });

    it('mappa correttamente downvote per restaurant e review', () => {
      const fn = (service as any).mapNotificationType.bind(service);

      const r1: NotificationType = fn('downvote', 'restaurant');
      const r2: NotificationType = fn('downvote', 'review');

      expect(r1).toBe('downvote_restaurant');
      expect(r2).toBe('downvote_review');
    });

    it('new_review → new_review indipendentemente dal target', () => {
      const fn = (service as any).mapNotificationType.bind(service);

      const r1: NotificationType = fn('new_review', 'restaurant');
      const r2: NotificationType = fn('new_review', 'review');

      expect(r1).toBe('new_review');
      expect(r2).toBe('new_review');
    });

    it('valori sconosciuti → reply', () => {
      const fn = (service as any).mapNotificationType.bind(service);

      const r1: NotificationType = fn('qualcosa', 'restaurant');
      const r2: NotificationType = fn('altro', 'review');

      expect(r1).toBe('reply');
      expect(r2).toBe('reply');
    });
  });

  // ----------------------------------------------------------------
  describe('mapNotificationFromBackend', () => {
    it('mappa tutti i campi principali e aggiunge Z se manca', () => {
      const raw = {
        id: 1,
        user_id: 10,
        actor_id: 20,
        target_type: 'restaurant',
        target_id: 30,
        review_id: null,
        reply_id: null,
        restaurant_id: 99,
        is_read: false,
        type: 'upvote',
        actor_username: 'alice',
        created_at: '2025-01-01T10:00:00', // senza Z
      };

      const n: Notification = service.mapNotificationFromBackend(raw);

      expect(n.id).toBe(1);
      expect(n.userId).toBe(10);
      expect(n.actorId).toBe(20);
      expect(n.targetType).toBe('restaurant');
      expect(n.targetId).toBe(30);
      expect(n.reviewId).toBeNull();
      expect(n.replyId).toBeNull();
      expect(n.restaurantId).toBe(99);
      expect(n.isRead).toBe(false);
      expect(n.type).toBe('upvote_restaurant');
      expect(n.actorUsername).toBe('alice');
      expect(n.createdAt).toBe('2025-01-01T10:00:00Z');
    });

    it('non modifica created_at se già in formato ISO con Z', () => {
      const raw = {
        id: 2,
        user_id: 11,
        actor_id: 21,
        target_type: 'review',
        target_id: 31,
        review_id: 7,
        reply_id: 8,
        restaurant_id: 100,
        is_read: true,
        type: 'downvote',
        created_at: '2025-02-02T12:00:00Z',
      };

      const n = service.mapNotificationFromBackend(raw);

      expect(n.createdAt).toBe('2025-02-02T12:00:00Z');
      expect(n.type).toBe('downvote_review');
      expect(n.reviewId).toBe(7);
      expect(n.replyId).toBe(8);
      expect(n.restaurantId).toBe(100);
    });

    it('gestisce created_at come Date/number convertendo in ISO', () => {
      const date = new Date('2025-03-03T15:30:00Z');

      const raw = {
        id: 3,
        user_id: 12,
        actor_id: 22,
        target_type: 'restaurant',
        target_id: 40,
        is_read: false,
        type: 'new_review',
        created_at: date,
      };

      const n = service.mapNotificationFromBackend(raw);

      expect(n.createdAt).toBe(date.toISOString());
      expect(n.type).toBe('new_review');
    });

    it('actor_username mancante → actorUsername undefined', () => {
      const raw = {
        id: 4,
        user_id: 13,
        actor_id: 23,
        target_type: 'review',
        target_id: 41,
        is_read: true,
        type: 'reply',
        created_at: '2025-01-01T00:00:00Z',
      };

      const n = service.mapNotificationFromBackend(raw);

      expect(n.actorUsername).toBeUndefined();
    });

    it('actor_username vuoto → mantiene stringa vuota', () => {
      const raw = {
        id: 5,
        user_id: 14,
        actor_id: 24,
        target_type: 'review',
        target_id: 42,
        is_read: false,
        type: 'reply',
        created_at: '2025-01-01T00:00:00Z',
        actor_username: '',
      };

      const n = service.mapNotificationFromBackend(raw);

      expect(n.actorUsername).toBe('');
    });
  });

  // ----------------------------------------------------------------
  describe('getAll', () => {
    it('chiama http.get("notifications") e mappa la lista', () => {
      const rawList = [
        {
          id: 1,
          user_id: 10,
          actor_id: 20,
          target_type: 'restaurant',
          target_id: 30,
          is_read: false,
          type: 'upvote',
          created_at: '2025-01-01T10:00:00',
        },
        {
          id: 2,
          user_id: 11,
          actor_id: 21,
          target_type: 'review',
          target_id: 31,
          is_read: true,
          type: 'downvote',
          created_at: '2025-01-02T11:00:00Z',
        },
      ];

      http.get.mockReturnValue(of(rawList));

      let result: Notification[] = [];

      service.getAll().subscribe(list => (result = list));

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith('notifications');

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[0].createdAt).toBe('2025-01-01T10:00:00Z');
      expect(result[1].type).toBe('downvote_review');
    });

    it('propaga errori http da http.get', () => {
      const err = new Error('fail getAll');
      http.get.mockReturnValue(throwError(() => err));

      let received: any = null;

      service.getAll().subscribe({
        next: () => expect(false).toBe(true),
        error: e => (received = e),
      });

      expect(received).toBe(err);
    });
  });

  // ----------------------------------------------------------------
  describe('getRecent', () => {
    it('chiama http.get("notifications/recent") e mappa la lista', () => {
      const rawList = [
        {
          id: 3,
          user_id: 12,
          actor_id: 25,
          target_type: 'restaurant',
          target_id: 50,
          is_read: false,
          type: 'new_review',
          created_at: '2025-04-04T09:00:00',
        },
      ];

      http.get.mockReturnValue(of(rawList));

      let result: Notification[] = [];

      service.getRecent().subscribe(list => (result = list));

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith('notifications/recent');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(3);
      expect(result[0].type).toBe('new_review');
      expect(result[0].createdAt).toBe('2025-04-04T09:00:00Z');
    });

    it('propaga errori http da http.get', () => {
      const err = new Error('fail getRecent');
      http.get.mockReturnValue(throwError(() => err));

      let received: any = null;

      service.getRecent().subscribe({
        next: () => expect(false).toBe(true),
        error: e => (received = e),
      });

      expect(received).toBe(err);
    });
  });

  // ----------------------------------------------------------------
  describe('markAsRead', () => {
    it('valida l\'id e chiama http.put("notifications/:id/read", {})', () => {
      http.put.mockReturnValue(of({ message: 'ok' }));

      let completed = false;

      service.markAsRead(10).subscribe({
        next: () => {},
        complete: () => (completed = true),
      });

      expect(completed).toBe(true);
      expect(http.put).toHaveBeenCalledTimes(1);
      expect(http.put).toHaveBeenCalledWith('notifications/10/read', {});
    });

    it('id non valido → ritorna Observable che emette errore senza chiamare http.put', () => {
      let received: any = null;

      service.markAsRead(0 as any).subscribe({
        next: () => expect(false).toBe(true),
        error: e => (received = e),
      });

      expect(received).toBeInstanceOf(Error);
      expect(received.message).toBe('ID non valido');
      expect(http.put).not.toHaveBeenCalled();
    });

    it('propaga errori http', () => {
      const err = new Error('put failed');
      http.put.mockReturnValue(throwError(() => err));

      let received: any = null;

      service.markAsRead(5).subscribe({
        error: e => (received = e),
      });

      expect(received).toBe(err);
    });
  });

  // ----------------------------------------------------------------
  describe('markAllAsRead', () => {
    it('chiama http.put("notifications/mark-all-read", {}) e completa', () => {
      http.put.mockReturnValue(of({ message: 'ok' }));

      let completed = false;

      service.markAllAsRead().subscribe({
        complete: () => (completed = true),
      });

      expect(completed).toBe(true);
      expect(http.put).toHaveBeenCalledTimes(1);
      expect(http.put).toHaveBeenCalledWith('notifications/mark-all-read', {});
    });

    it('propaga errori http', () => {
      const err = new Error('mark-all failed');
      http.put.mockReturnValue(throwError(() => err));

      let received: any = null;

      service.markAllAsRead().subscribe({
        error: e => (received = e),
      });

      expect(received).toBe(err);
    });
  });

  // ----------------------------------------------------------------
  describe('delete', () => {
    it('valida l\'id e chiama http.delete("notifications/:id")', () => {
      http.delete.mockReturnValue(of(void 0));

      let completed = false;

      service.delete(7).subscribe({
        complete: () => (completed = true),
      });

      expect(completed).toBe(true);
      expect(http.delete).toHaveBeenCalledTimes(1);
      expect(http.delete).toHaveBeenCalledWith('notifications/7');
    });

    it('id non valido → Observable che emette errore e non chiama http.delete', () => {
      let received: any = null;

      service.delete(-1 as any).subscribe({
        next: () => expect(false).toBe(true),
        error: e => (received = e),
      });

      expect(received).toBeInstanceOf(Error);
      expect(received.message).toBe('ID non valido');
      expect(http.delete).not.toHaveBeenCalled();
    });

    it('propaga errori http', () => {
      const err = new Error('delete failed');
      http.delete.mockReturnValue(throwError(() => err));

      let received: any = null;

      service.delete(3).subscribe({
        error: e => (received = e),
      });

      expect(received).toBe(err);
    });
  });
});
