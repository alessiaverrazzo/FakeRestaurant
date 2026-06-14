import NotificationRepository from "../../../src/repositories/NotificationRepository";
import Notification from "../../../src/models/Notification";
import Review from "../../../src/models/Review";
import Restaurant from "../../../src/models/Restaurant";
import { Op } from "sequelize";
import User from "../../../src/models/User";

// Mock dei modelli Sequelize
jest.mock("../../../src/models/Notification");
jest.mock("../../../src/models/Review");
jest.mock("../../../src/models/Restaurant");

describe("NotificationRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("dovrebbe salvare una nuova notifica e restituirla", async () => {
      const fakeNotif = new Notification();
      (fakeNotif.save as jest.Mock) = jest.fn().mockResolvedValue(fakeNotif);

      const result = await NotificationRepository.create(fakeNotif);

      expect(fakeNotif.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(fakeNotif);
    });

    it("dovrebbe propagare un errore se il salvataggio fallisce", async () => {
      const fakeNotif = new Notification();
      (fakeNotif.save as jest.Mock) = jest.fn().mockRejectedValue(new Error("DB error"));

      await expect(NotificationRepository.create(fakeNotif)).rejects.toThrow("DB error");
      expect(fakeNotif.save).toHaveBeenCalledTimes(1);
    });

    it("dovrebbe restituire lo stesso oggetto passato dopo il save", async () => {
      const fakeNotif = new Notification();
      (fakeNotif.save as jest.Mock) = jest.fn().mockResolvedValue(fakeNotif);

      const result = await NotificationRepository.create(fakeNotif);

      expect(result).toBe(fakeNotif);
    });
  });

  describe("findById", () => {
    it("dovrebbe restituire la notifica se esiste", async () => {
      const fakeNotif = { id: 1 } as Notification;
      (Notification.findByPk as jest.Mock).mockResolvedValue(fakeNotif);

      const result = await NotificationRepository.findById(1);

      expect(Notification.findByPk).toHaveBeenCalledWith(1, {
        include: [
          {
            model: User,
            as: "actor",
            attributes: ["id", "username"]
          },
          {
            model: Review,
            as: "review",
            attributes: ["id", "restaurant_id", "parent_review_id"]
          },
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id"]
          }
        ]
      });

      expect(result).toBe(fakeNotif);
    });

    it("dovrebbe restituire null se la notifica non esiste", async () => {
      (Notification.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await NotificationRepository.findById(999);

      expect(Notification.findByPk).toHaveBeenCalledWith(999, {
        include: [
          {
            model: User,
            as: "actor",
            attributes: ["id", "username"]
          },
          {
            model: Review,
            as: "review",
            attributes: ["id", "restaurant_id", "parent_review_id"]
          },
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id"]
          }
        ]
      });

      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Notification.findByPk as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(NotificationRepository.findById(1)).rejects.toThrow("DB error");

      expect(Notification.findByPk).toHaveBeenCalledWith(1, {
        include: [
          {
            model: User,
            as: "actor",
            attributes: ["id", "username"]
          },
          {
            model: Review,
            as: "review",
            attributes: ["id", "restaurant_id", "parent_review_id"]
          },
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id"]
          }
        ]
      });
    });
  });

  describe("findByUserId", () => {
    it("dovrebbe restituire tutte le notifiche di un utente", async () => {
      const fakeNotifs = [{ id: 1 }, { id: 2 }] as Notification[];
      (Notification.findAll as jest.Mock).mockResolvedValue(fakeNotifs);

      const result = await NotificationRepository.findByUserId(5);

      expect(Notification.findAll).toHaveBeenCalledWith({
        where: { user_id: 5 },
        order: [["created_at", "DESC"]],
        include: [
          {
            model: Review,
            as: "review",
            attributes: ["id", "restaurant_id", "parent_review_id"],
          },
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id"],
          },
          {
            model: User,
            as: "actor",
            attributes: ["id", "username"],
          },
        ],
      });

      expect(result).toBe(fakeNotifs);
    });

    it("dovrebbe restituire un array vuoto se non ci sono notifiche", async () => {
      (Notification.findAll as jest.Mock).mockResolvedValue([]);

      const result = await NotificationRepository.findByUserId(5);

      expect(Notification.findAll).toHaveBeenCalledWith({
        where: { user_id: 5 },
        order: [["created_at", "DESC"]],
        include: [
          {
            model: Review,
            as: "review",
            attributes: ["id", "restaurant_id", "parent_review_id"],
          },
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id"],
          },
          {
            model: User,
            as: "actor",
            attributes: ["id", "username"],
          },
        ],
      });

      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Notification.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(NotificationRepository.findByUserId(5)).rejects.toThrow("DB error");

      expect(Notification.findAll).toHaveBeenCalledWith({
        where: { user_id: 5 },
        order: [["created_at", "DESC"]],
        include: [
          {
            model: Review,
            as: "review",
            attributes: ["id", "restaurant_id", "parent_review_id"],
          },
          {
            model: Restaurant,
            as: "restaurant",
            attributes: ["id"],
          },
          {
            model: User,
            as: "actor",
            attributes: ["id", "username"],
          },
        ],
      });
    });
  });

  describe("findRecentByUserId", () => {
    it("dovrebbe restituire le notifiche degli ultimi 7 giorni", async () => {
      const fakeNotifs = [{ id: 1 }, { id: 2 }] as Notification[];
      (Notification.findAll as jest.Mock).mockResolvedValue(fakeNotifs);

      const result = await NotificationRepository.findRecentByUserId(5);

      expect(Notification.findAll).toHaveBeenCalled();

      const args = (Notification.findAll as jest.Mock).mock.calls[0][0];

      expect(args.where.user_id).toBe(5);
      expect(args.where.created_at[Op.gte]).toBeInstanceOf(Date);
      expect(args.include).toEqual([
        {
          model: Review,
          as: "review",
          attributes: ["id", "restaurant_id", "parent_review_id"],
        },
        {
          model: Restaurant,
          as: "restaurant",
          attributes: ["id"],
        },
        {
          model: User,
          as: "actor",
          attributes: ["id", "username"],
        },
      ]);

      expect(result).toBe(fakeNotifs);
    });

    it("dovrebbe restituire un array vuoto se non ci sono notifiche recenti", async () => {
      (Notification.findAll as jest.Mock).mockResolvedValue([]);

      const result = await NotificationRepository.findRecentByUserId(5);

      expect(Notification.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Notification.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(NotificationRepository.findRecentByUserId(5)).rejects.toThrow("DB error");
      expect(Notification.findAll).toHaveBeenCalled();
    });
  });

  describe("markAsRead", () => {
    it("dovrebbe segnare una notifica come letta se esiste", async () => {
      const fakeNotif = { is_read: false, save: jest.fn().mockResolvedValue(true) } as any;
      (Notification.findByPk as jest.Mock).mockResolvedValue(fakeNotif);

      const result = await NotificationRepository.markAsRead(1);

      expect(Notification.findByPk).toHaveBeenCalledWith(1);
      expect(fakeNotif.is_read).toBe(true);
      expect(fakeNotif.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se la notifica non esiste", async () => {
      (Notification.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await NotificationRepository.markAsRead(999);

      expect(Notification.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBe(false);
    });

    it("dovrebbe propagare un errore se il salvataggio fallisce", async () => {
      const fakeNotif = { is_read: false, save: jest.fn().mockRejectedValue(new Error("DB error")) } as any;
      (Notification.findByPk as jest.Mock).mockResolvedValue(fakeNotif);

      await expect(NotificationRepository.markAsRead(1)).rejects.toThrow("DB error");
      expect(fakeNotif.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("markAllAsRead", () => {
    it("dovrebbe aggiornare tutte le notifiche non lette e restituire il conteggio", async () => {
      (Notification.update as jest.Mock).mockResolvedValue([3]);

      const result = await NotificationRepository.markAllAsRead(5);

      expect(Notification.update).toHaveBeenCalledWith(
        { is_read: true },
        { where: { user_id: 5, is_read: false } }
      );

      expect(result).toBe(3);
    });

    it("dovrebbe restituire 0 se non ci sono notifiche da aggiornare", async () => {
      (Notification.update as jest.Mock).mockResolvedValue([0]);

      const result = await NotificationRepository.markAllAsRead(5);

      expect(Notification.update).toHaveBeenCalledWith(
        { is_read: true },
        { where: { user_id: 5, is_read: false } }
      );

      expect(result).toBe(0);
    });

    it("dovrebbe propagare un errore se l'update fallisce", async () => {
      (Notification.update as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(NotificationRepository.markAllAsRead(5)).rejects.toThrow("DB error");

      expect(Notification.update).toHaveBeenCalledWith(
        { is_read: true },
        { where: { user_id: 5, is_read: false } }
      );
    });
  });

  describe("delete", () => {
    it("dovrebbe eliminare la notifica se esiste e restituire true", async () => {
      (Notification.destroy as jest.Mock).mockResolvedValue(1);

      const result = await NotificationRepository.delete(1, 5);

      expect(Notification.destroy).toHaveBeenCalledWith({
        where: { id: 1, user_id: 5 },
      });

      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se la notifica non esiste", async () => {
      (Notification.destroy as jest.Mock).mockResolvedValue(0);

      const result = await NotificationRepository.delete(999, 5);

      expect(Notification.destroy).toHaveBeenCalledWith({
        where: { id: 999, user_id: 5 },
      });

      expect(result).toBe(false);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Notification.destroy as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(NotificationRepository.delete(1, 5)).rejects.toThrow("DB error");

      expect(Notification.destroy).toHaveBeenCalledWith({
        where: { id: 1, user_id: 5 },
      });
    });
  });

  describe("findRecentByActor", () => {
    it("dovrebbe restituire le notifiche recenti dell'attore negli ultimi 2 secondi", async () => {
      const fakeNotifs = [{ id: 1 }, { id: 2 }] as Notification[];

      (Notification.findAll as jest.Mock).mockResolvedValue(fakeNotifs);

      const result = await NotificationRepository.findRecentByActor(10);

      const args = (Notification.findAll as jest.Mock).mock.calls[0][0];

      expect(args.where.actor_id).toBe(10);
      expect(args.where.created_at[Op.gte]).toBeInstanceOf(Date);

      expect(args.include).toEqual([
        {
          model: User,
          as: "actor",
          attributes: ["id", "username"],
        },
      ]);

      expect(args.order).toEqual([["created_at", "DESC"]]);
      expect(result).toBe(fakeNotifs);
    });

    it("dovrebbe restituire un array vuoto se l'attore non ha notifiche recenti", async () => {
      (Notification.findAll as jest.Mock).mockResolvedValue([]);

      const result = await NotificationRepository.findRecentByActor(10);

      expect(Notification.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Notification.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(NotificationRepository.findRecentByActor(10)).rejects.toThrow("DB error");

      expect(Notification.findAll).toHaveBeenCalled();
    });
  });
});
