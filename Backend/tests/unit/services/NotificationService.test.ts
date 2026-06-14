import NotificationService from '../../../src/services/NotificationService';
import NotificationRepository from '../../../src/repositories/NotificationRepository';
import Notification from '../../../src/models/Notification';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/repositories/NotificationRepository');

// Helper per costruire notifiche valide
const buildNotif = (overrides = {}) =>
    Notification.build({
        id: 1,
        user_id: 1,
        type: "upvote",
        actor_id: 2,
        target_type: "review",
        target_id: 999,
        is_read: false,
        ...overrides
    });

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('dovrebbe creare una notifica', async () => {
      const notification = buildNotif();
      (NotificationRepository.create as jest.Mock).mockResolvedValue(notification);

      const result = await NotificationService.create(notification);

      expect(result).toBe(notification);
      expect(NotificationRepository.create).toHaveBeenCalledWith(notification);
    });
  });

  describe('getById', () => {
    it('dovrebbe restituire la notifica se esiste', async () => {
      const notification = buildNotif({ id: 1 });
      (NotificationRepository.findById as jest.Mock).mockResolvedValue(notification);

      const result = await NotificationService.getById(1);

      expect(result).toBe(notification);
      expect(NotificationRepository.findById).toHaveBeenCalledWith(1);
    });

    it('dovrebbe lanciare errore se la notifica non esiste', async () => {
      (NotificationRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(NotificationService.getById(999))
        .rejects
        .toThrow(new AppError("Notifica non trovata", 404));
    });
  });

  describe('getByUserId', () => {
    it("dovrebbe restituire tutte le notifiche dell'utente", async () => {
      const notifications = [buildNotif({ id: 1 }), buildNotif({ id: 2 })];

      (NotificationRepository.findByUserId as jest.Mock).mockResolvedValue(notifications);

      const result = await NotificationService.getByUserId(1);

      expect(result).toBe(notifications);
      expect(NotificationRepository.findByUserId).toHaveBeenCalledWith(1);
    });

    it("dovrebbe restituire array vuoto se l'utente non ha notifiche", async () => {
      (NotificationRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await NotificationService.getByUserId(2);

      expect(result).toEqual([]);
      expect(NotificationRepository.findByUserId).toHaveBeenCalledWith(2);
    });
  });

  describe('getRecentByUserId', () => {
    it('dovrebbe restituire notifiche recenti', async () => {
      const notifications = [buildNotif()];

      (NotificationRepository.findRecentByUserId as jest.Mock).mockResolvedValue(notifications);

      const result = await NotificationService.getRecentByUserId(1);

      expect(result).toBe(notifications);
      expect(NotificationRepository.findRecentByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('markAsRead', () => {
    it('dovrebbe segnare la notifica come letta se utente corretto', async () => {
      const notif = buildNotif({ id: 1, user_id: 1 });

      (NotificationRepository.findById as jest.Mock).mockResolvedValue(notif);
      (NotificationRepository.markAsRead as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.markAsRead(1, 1);

      expect(NotificationRepository.markAsRead).toHaveBeenCalledWith(1);
    });

    it('dovrebbe lanciare errore se notifica non esiste', async () => {
      (NotificationRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(NotificationService.markAsRead(1, 999))
        .rejects
        .toThrow(new AppError("Notifica non trovata", 404));
    });

    it('dovrebbe lanciare errore se utente non autorizzato', async () => {
      const notif = buildNotif({ id: 1, user_id: 2 });

      (NotificationRepository.findById as jest.Mock).mockResolvedValue(notif);

      await expect(NotificationService.markAsRead(1, 1))
        .rejects
        .toThrow(new AppError("Non autorizzato", 403));
    });
  });

  describe('markAllAsRead', () => {
    it('dovrebbe chiamare il repository', async () => {
      (NotificationRepository.markAllAsRead as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.markAllAsRead(1);

      expect(NotificationRepository.markAllAsRead).toHaveBeenCalledWith(1);
    });
  });

  describe('delete', () => {
    it('dovrebbe eliminare la notifica se utente corretto', async () => {
      const notif = buildNotif({ id: 1, user_id: 1 });

      (NotificationRepository.findById as jest.Mock).mockResolvedValue(notif);
      (NotificationRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.delete({ id: 1, userId: 1 });

      expect(NotificationRepository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('dovrebbe lanciare errore se notifica non esiste', async () => {
      (NotificationRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(NotificationService.delete({ id: 999, userId: 1 }))
        .rejects
        .toThrow(new AppError("Notifica non trovata", 404));
    });

    it('dovrebbe lanciare errore se utente non autorizzato', async () => {
      const notif = buildNotif({ id: 1, user_id: 2 });

      (NotificationRepository.findById as jest.Mock).mockResolvedValue(notif);

      await expect(NotificationService.delete({ id: 1, userId: 1 }))
        .rejects
        .toThrow(new AppError("Non autorizzato", 403));
    });
  });

  describe('getLastByActor', () => {
    it("dovrebbe restituire notifiche recenti dell'attore", async () => {
      const notifications = [
        buildNotif({ id: 1, user_id: 10, actor_id: 3 }),
      ];

      (NotificationRepository.findRecentByActor as jest.Mock).mockResolvedValue(notifications);

      const result = await NotificationService.getLastByActor(3);

      expect(result).toBe(notifications);
      expect(NotificationRepository.findRecentByActor).toHaveBeenCalledWith(3);
    });

    it("dovrebbe restituire array vuoto se non ci sono notifiche", async () => {
      (NotificationRepository.findRecentByActor as jest.Mock).mockResolvedValue([]);

      const result = await NotificationService.getLastByActor(3);

      expect(result).toEqual([]);
    });

    it("dovrebbe propagare errori del repository", async () => {
      (NotificationRepository.findRecentByActor as jest.Mock)
        .mockRejectedValue(new Error("DB error"));

      await expect(NotificationService.getLastByActor(3))
        .rejects
        .toThrow("DB error");
    });
  });
});
