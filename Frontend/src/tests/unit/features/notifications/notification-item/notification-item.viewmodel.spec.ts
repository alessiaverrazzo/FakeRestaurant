import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationItemViewModel } from '@features/notifications/notification-item/viewmodels/notification-item.viewmodel';
import { NotificationItem } from '@features/notifications/notification-item/models/notification-item.model';

// Helper per creare notifiche valide
function createNotification(partial: Partial<NotificationItem>): NotificationItem {
  return {
    id: 1,
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

    isNew: false,

    ...partial
  };
}

describe('NotificationItemViewModel', () => {

  let vm: NotificationItemViewModel;

  beforeEach(() => {
    vm = new NotificationItemViewModel();
  });

  // ----------------------------------------------------------------
  describe('init', () => {
    it('dovrebbe assegnare correttamente la notifica al viewmodel', () => {
      const notif = createNotification({ id: 99 });
      vm.init(notif);
      expect(vm.notification).toBe(notif);
    });
  });

  // ----------------------------------------------------------------
  describe('getIconType', () => {
    it('dovrebbe ritornare il tipo corretto della notifica', () => {
      vm.init(createNotification({ type: 'reply' }));
      expect(vm.getIconType()).toBe('reply');
    });
  });

  // ----------------------------------------------------------------
  describe('getMessage', () => {
    it('dovrebbe generare il messaggio corretto per "upvote_review"', () => {
      vm.init(createNotification({ type: 'upvote_review', actorUsername: 'Luca' }));
      expect(vm.getMessage()).toBe('Luca ha messo un upvote alla tua recensione');
    });

    it('dovrebbe generare il messaggio corretto per "downvote_review"', () => {
      vm.init(createNotification({ type: 'downvote_review', actorUsername: 'Luca' }));
      expect(vm.getMessage()).toBe('Luca ha messo un downvote alla tua recensione');
    });

    it('dovrebbe generare il messaggio corretto per "upvote_restaurant"', () => {
      vm.init(createNotification({ type: 'upvote_restaurant', actorUsername: 'Luca' }));
      expect(vm.getMessage()).toBe('Luca ha messo un upvote al tuo ristorante');
    });

    it('dovrebbe generare il messaggio corretto per "downvote_restaurant"', () => {
      vm.init(createNotification({ type: 'downvote_restaurant', actorUsername: 'Luca' }));
      expect(vm.getMessage()).toBe('Luca ha messo un downvote al tuo ristorante');
    });

    it('dovrebbe generare il messaggio corretto per "new_review"', () => {
      vm.init(createNotification({ type: 'new_review', actorUsername: 'Luca' }));
      expect(vm.getMessage()).toBe('Luca ha scritto una nuova recensione al tuo ristorante');
    });

    it('dovrebbe generare il messaggio corretto per "reply"', () => {
      vm.init(createNotification({ type: 'reply', actorUsername: 'Luca' }));
      expect(vm.getMessage()).toBe('Luca ha risposto alla tua recensione');
    });

    it('dovrebbe generare un messaggio di fallback per un tipo sconosciuto', () => {
      vm.init(createNotification({ type: 'unknown_type' as any, actorUsername: 'Luca' }));
      expect(vm.getMessage()).toBe("Luca ha eseguito un'azione sul tuo account");
    });

    it('dovrebbe usare "Qualcuno" se actorUsername non è presente', () => {
      vm.init(createNotification({ type: 'reply', actorUsername: undefined }));
      expect(vm.getMessage()).toBe('Qualcuno ha risposto alla tua recensione');
    });
  });

  // ----------------------------------------------------------------
  describe('getContainerClasses', () => {
    it('dovrebbe ritornare la classe per lo sfondo bianco se la notifica è letta', () => {
      vm.init(createNotification({ isRead: true }));
      expect(vm.getContainerClasses()).toEqual({
        'bg-white-background': true,
        'bg-yellow-soft': false
      });
    });

    it('dovrebbe ritornare la classe per lo sfondo giallo se la notifica non è letta', () => {
      vm.init(createNotification({ isRead: false }));
      expect(vm.getContainerClasses()).toEqual({
        'bg-white-background': false,
        'bg-yellow-soft': true
      });
    });
  });

  // ----------------------------------------------------------------
  describe('getAllClasses', () => {
    it('dovrebbe ritornare le classi corrette per una notifica letta e non nuova', () => {
      vm.init(createNotification({ isRead: true, isNew: false }));
      expect(vm.getAllClasses()).toEqual({
        'bg-white-background': true,
        'bg-yellow-soft': false,
        'live-notification': false
      });
    });

    it('dovrebbe ritornare le classi corrette per una notifica non letta e nuova', () => {
      vm.init(createNotification({ isRead: false, isNew: true }));
      expect(vm.getAllClasses()).toEqual({
        'bg-white-background': false,
        'bg-yellow-soft': true,
        'live-notification': true
      });
    });
  });

});
