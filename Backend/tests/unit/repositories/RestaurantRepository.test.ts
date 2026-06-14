import RestaurantRepository from "../../../src/repositories/RestaurantRepository";
import { Restaurant } from "../../../src/models/Restaurant";
import { sequelize } from "../../../src/config/sequelize";
import { QueryTypes } from "sequelize";

// Mock dei metodi del modello
jest.mock("../../../src/models/Restaurant", () => ({
  Restaurant: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("../../../src/models/VoteRestaurant", () => ({}));

jest.mock("../../../src/models/User", () => ({
  __esModule: true,
  default: { init: jest.fn() },
}));

jest.mock("../../../src/config/sequelize", () => ({
  sequelize: { query: jest.fn() },
}));

describe("RestaurantRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("dovrebbe chiamare save() e restituire il ristorante se tutto va bene", async () => {
      const mock = { save: jest.fn().mockResolvedValue(undefined) } as any;

      const result = await RestaurantRepository.create(mock);

      expect(mock.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(mock);
    });

    it("dovrebbe propagare un errore se save() fallisce", async () => {
      const mockRestaurant = { save: jest.fn().mockRejectedValue(new Error("DB error")) } as unknown as Restaurant;

      await expect(RestaurantRepository.create(mockRestaurant)).rejects.toThrow("DB error");
      expect(mockRestaurant.save).toHaveBeenCalledTimes(1);
    });

    it("dovrebbe funzionare anche con un ristorante parzialmente popolato", async () => {
      const mockRestaurant = {
        name: "Test Restaurant",
        save: jest.fn().mockResolvedValue(undefined),
      } as unknown as Restaurant;

      const result = await RestaurantRepository.create(mockRestaurant);

      expect(mockRestaurant.save).toHaveBeenCalled();
      expect(result.name).toBe("Test Restaurant");
    });

    it("non dovrebbe chiamare altri metodi oltre a save()", async () => {
      const mockRestaurant = {
        save: jest.fn().mockResolvedValue(undefined),
        someOtherMethod: jest.fn(),
      } as unknown as Restaurant;

      const result = await RestaurantRepository.create(mockRestaurant);

      expect(mockRestaurant.save).toHaveBeenCalledTimes(1);
      expect((mockRestaurant as any).someOtherMethod).not.toHaveBeenCalled();
      expect(result).toBe(mockRestaurant);
    });
  });

  describe("findById", () => {
    it("dovrebbe restituire il ristorante se trovato", async () => {
      const fakeRestaurant = { id: 1, name: "Test" } as Restaurant;
      (Restaurant.findByPk as jest.Mock).mockResolvedValue(fakeRestaurant);

      const result = await RestaurantRepository.findById(1);

      expect(Restaurant.findByPk).toHaveBeenCalledTimes(1);
      expect(Restaurant.findByPk).toHaveBeenCalledWith(1);
      expect(result).toBe(fakeRestaurant);
    });

    it("dovrebbe restituire null se il ristorante non esiste", async () => {
      (Restaurant.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await RestaurantRepository.findById(999);

      expect(Restaurant.findByPk).toHaveBeenCalledTimes(1);
      expect(Restaurant.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Restaurant.findByPk as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.findById(123)).rejects.toThrow("DB error");
      expect(Restaurant.findByPk).toHaveBeenCalledTimes(1);
      expect(Restaurant.findByPk).toHaveBeenCalledWith(123);
    });
  });

  describe("findByUserId", () => {
    it("dovrebbe restituire tutti i ristoranti di un utente", async () => {
      const fakeList = [
        { id: 1, name: "Ristorante 1", user_id: 42 },
        { id: 2, name: "Ristorante 2", user_id: 42 },
      ] as unknown as Restaurant[];

      (Restaurant.findAll as jest.Mock).mockResolvedValue(fakeList);

      const result = await RestaurantRepository.findByUserId(42);

      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
      expect(Restaurant.findAll).toHaveBeenCalledWith({ where: { user_id: 42 } });
      expect(result).toBe(fakeList);
    });

    it("dovrebbe restituire un array vuoto se l'utente non ha ristoranti", async () => {
      (Restaurant.findAll as jest.Mock).mockResolvedValue([]);

      const result = await RestaurantRepository.findByUserId(999);

      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
      expect(Restaurant.findAll).toHaveBeenCalledWith({ where: { user_id: 999 } });
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Restaurant.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.findByUserId(123)).rejects.toThrow("DB error");
      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
      expect(Restaurant.findAll).toHaveBeenCalledWith({ where: { user_id: 123 } });
    });
  });

  describe("update", () => {
    it("dovrebbe restituire null se il ristorante non esiste", async () => {
      (Restaurant.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await RestaurantRepository.update({ id: 999 } as Restaurant);

      expect(Restaurant.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("dovrebbe aggiornare solo il name se la description non è fornita", async () => {
      const existing = {
        id: 1,
        name: "Vecchio Nome",
        description: "Vecchia Desc",
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      (Restaurant.findByPk as jest.Mock).mockResolvedValue(existing);

      const updated = { id: 1, name: "Nuovo Nome", description: existing.description } as Restaurant;

      const result = await RestaurantRepository.update(updated);

      expect(Restaurant.findByPk).toHaveBeenCalledWith(1);
      expect(existing.name).toBe("Nuovo Nome");
      expect(existing.description).toBe("Vecchia Desc");
      expect(existing.save).toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("dovrebbe aggiornare solo la description se il name non è fornito", async () => {
      const existing = {
        id: 2,
        name: "Nome Vecchio",
        description: "Desc Vecchia",
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      (Restaurant.findByPk as jest.Mock).mockResolvedValue(existing);

      const updated = { id: 2, name: existing.name, description: "Desc Nuova" } as Restaurant;

      const result = await RestaurantRepository.update(updated);

      expect(Restaurant.findByPk).toHaveBeenCalledWith(2);
      expect(existing.name).toBe("Nome Vecchio");
      expect(existing.description).toBe("Desc Nuova");
      expect(existing.save).toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("aggiorna anche image_url quando definita", async () => {
      const existing = {
        id: 10,
        name: "Old",
        description: "Old",
        image_url: null,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (Restaurant.findByPk as jest.Mock).mockResolvedValue(existing);

      const updated = {
        id: 10,
        name: "Updated",
        description: "Updated",
        image_url: "new.jpg",
      } as any;

      const result = await RestaurantRepository.update(updated);

      expect(existing.image_url).toBe("new.jpg");
      expect(result).toBe(existing);
    });

    it("dovrebbe aggiornare sia name che description", async () => {
      const existing = {
        id: 3,
        name: "Old Name",
        description: "Old Desc",
        save: jest.fn().mockResolvedValue(undefined),
      } as any;

      (Restaurant.findByPk as jest.Mock).mockResolvedValue(existing);

      const updated = { id: 3, name: "New Name", description: "New Desc" } as Restaurant;

      const result = await RestaurantRepository.update(updated);

      expect(Restaurant.findByPk).toHaveBeenCalledWith(3);
      expect(existing.name).toBe("New Name");
      expect(existing.description).toBe("New Desc");
      expect(existing.save).toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("dovrebbe propagare un errore se save() fallisce", async () => {
      const existing = {
        id: 4,
        name: "Old Name",
        description: "Old Desc",
        save: jest.fn().mockRejectedValue(new Error("DB error")),
      } as any;

      (Restaurant.findByPk as jest.Mock).mockResolvedValue(existing);

      const updated = { id: 4, name: "Fail Name", description: "Fail Desc" } as Restaurant;

      await expect(RestaurantRepository.update(updated)).rejects.toThrow("DB error");
      expect(existing.save).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("dovrebbe restituire true se il ristorante è stato eliminato", async () => {
      (Restaurant.destroy as jest.Mock).mockResolvedValue(1);

      const result = await RestaurantRepository.delete(1, 10);

      expect(Restaurant.destroy).toHaveBeenCalledTimes(1);
      expect(Restaurant.destroy).toHaveBeenCalledWith({ where: { id: 10, user_id: 1 } });
      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se nessun ristorante è stato eliminato", async () => {
      (Restaurant.destroy as jest.Mock).mockResolvedValue(0);

      const result = await RestaurantRepository.delete(1, 999);

      expect(Restaurant.destroy).toHaveBeenCalledTimes(1);
      expect(Restaurant.destroy).toHaveBeenCalledWith({ where: { id: 999, user_id: 1 } });
      expect(result).toBe(false);
    });

    it("dovrebbe propagare un errore se destroy fallisce", async () => {
      (Restaurant.destroy as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.delete(1, 123)).rejects.toThrow("DB error");
      expect(Restaurant.destroy).toHaveBeenCalledTimes(1);
      expect(Restaurant.destroy).toHaveBeenCalledWith({ where: { id: 123, user_id: 1 } });
    });
  });

  describe("findAll", () => {
    it("dovrebbe restituire tutti i ristoranti se presenti", async () => {
      const fakeList = [
        { id: 1, name: "Ristorante 1" },
        { id: 2, name: "Ristorante 2" },
      ] as unknown as Restaurant[];

      (Restaurant.findAll as jest.Mock).mockResolvedValue(fakeList);

      const result = await RestaurantRepository.findAll();

      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
      expect(Restaurant.findAll).toHaveBeenCalledWith();
      expect(result).toBe(fakeList);
    });

    it("dovrebbe restituire un array vuoto se non ci sono ristoranti", async () => {
      (Restaurant.findAll as jest.Mock).mockResolvedValue([]);

      const result = await RestaurantRepository.findAll();

      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Restaurant.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.findAll()).rejects.toThrow("DB error");
      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("findByIdWithVotes", () => {
    it("dovrebbe restituire il ristorante con voti se trovato", async () => {
      const fakeRestaurant = {
        id: 1,
        name: "Ristorante 1",
        upvotes: 5,
        downvotes: 2,
      } as any;

      (Restaurant.findOne as jest.Mock).mockResolvedValue(fakeRestaurant);

      const result = await RestaurantRepository.findByIdWithVotes(1);

      expect(Restaurant.findOne).toHaveBeenCalledTimes(1);

      expect(Restaurant.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          attributes: expect.objectContaining({
            include: expect.any(Array),
          }),
          include: expect.any(Array),
          group: expect.arrayContaining(["Restaurant.id"]), // FIX
        })
      );

      expect(result).toBe(fakeRestaurant);
    });

    it("dovrebbe restituire null se il ristorante non esiste", async () => {
      (Restaurant.findOne as jest.Mock).mockResolvedValue(null);

      const result = await RestaurantRepository.findByIdWithVotes(999);

      expect(Restaurant.findOne).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Restaurant.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.findByIdWithVotes(123)).rejects.toThrow("DB error");
      expect(Restaurant.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe("findAllWithVotes", () => {
    it("dovrebbe restituire tutti i ristoranti con voti", async () => {
      const fakeList = [
        { id: 1, name: "Ristorante 1", upvotes: 5, downvotes: 2 },
        { id: 2, name: "Ristorante 2", upvotes: 3, downvotes: 1 },
      ] as any[];

      (Restaurant.findAll as jest.Mock).mockResolvedValue(fakeList);

      const result = await RestaurantRepository.findAllWithVotes();

      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);

      expect(Restaurant.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({ include: expect.any(Array) }),
          include: expect.any(Array),
          group: expect.arrayContaining(["Restaurant.id"]), // FIX
        })
      );

      expect(result).toBe(fakeList);
    });

    it("dovrebbe restituire un array vuoto se non ci sono ristoranti", async () => {
      (Restaurant.findAll as jest.Mock).mockResolvedValue([]);

      const result = await RestaurantRepository.findAllWithVotes();

      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Restaurant.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.findAllWithVotes()).rejects.toThrow("DB error");
      expect(Restaurant.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("findByIdWithUser", () => {
    it("dovrebbe restituire il ristorante con owner se trovato", async () => {
      const fakeRestaurant = {
        id: 1,
        name: "Ristorante Test",
        owner: { username: "Alessia", icon_id: 4 },
      } as any;

      (Restaurant.findByPk as jest.Mock).mockResolvedValue(fakeRestaurant);

      const result = await RestaurantRepository.findByIdWithUser(1);

      expect(Restaurant.findByPk).toHaveBeenCalledTimes(1);
      expect(Restaurant.findByPk).toHaveBeenCalledWith(1, {
        include: [
          {
            model: expect.anything(),
            as: "owner",
            attributes: ["username", "icon_id"],
          },
        ],
      });

      expect(result).toBe(fakeRestaurant);
    });

    it("dovrebbe restituire null se il ristorante non esiste", async () => {
      (Restaurant.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await RestaurantRepository.findByIdWithUser(999);

      expect(Restaurant.findByPk).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (Restaurant.findByPk as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.findByIdWithUser(123)).rejects.toThrow("DB error");
      expect(Restaurant.findByPk).toHaveBeenCalledTimes(1);
    });
  });

  describe("searchByName", () => {
    it("dovrebbe eseguire la query SQL corretta e restituire i risultati", async () => {
      const fakeResults = [
        { id: 1, name: "Trattoria Test", upvotes: 10, downvotes: 2 },
        { id: 2, name: "Trattoria Bella", upvotes: 4, downvotes: 1 },
      ];

      (sequelize.query as jest.Mock).mockResolvedValue(fakeResults);

      const result = await RestaurantRepository.searchByName("Trattoria");

      expect(sequelize.query).toHaveBeenCalledTimes(1);

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE LOWER(r.name) LIKE :pattern"), // FIX
        expect.objectContaining({
          replacements: { pattern: "%trattoria%" }, // FIX lowercase
        })
      );

      expect(result).toBe(fakeResults);
    });

    it("dovrebbe restituire un array vuoto se non ci sono risultati", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      const result = await RestaurantRepository.searchByName("pippo");

      expect(sequelize.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se sequelize.query fallisce", async () => {
      (sequelize.query as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.searchByName("test")).rejects.toThrow("DB error");
      expect(sequelize.query).toHaveBeenCalledTimes(1);
    });

    it("usa query = '' quando il parametro non è stringa", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      await RestaurantRepository.searchByName(123 as any);

      expect(sequelize.query).toHaveBeenCalledWith(expect.any(String), {
        replacements: { pattern: "%%" },
        type: QueryTypes.SELECT,
      });
    });

    it("trunca la query oltre 100 caratteri", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      const long = "a".repeat(150);

      await RestaurantRepository.searchByName(long);

      const expected = `%${"a".repeat(100)}%`;

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          replacements: { pattern: expected },
        })
      );
    });

  });

  describe("searchByPosition", () => {
    it("dovrebbe eseguire la query SQL corretta con parametri geografici e restituire i risultati", async () => {
      const fakeResults = [
        {
          id: 1,
          name: "Ristorante 1",
          distance: 1.2,
          upvotes: 10,
          downvotes: 2,
        },
        {
          id: 2,
          name: "Ristorante 2",
          distance: 3.5,
          upvotes: 5,
          downvotes: 1,
        },
      ];

      (sequelize.query as jest.Mock).mockResolvedValue(fakeResults);

      const lat = 40.0;
      const lng = 14.0;
      const radius = 5;

      const result = await RestaurantRepository.searchByPosition(lat, lng, radius);

      expect(sequelize.query).toHaveBeenCalledTimes(1);

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("6371 * acos"),
        {
          replacements: { lat, lng, radiusKm: radius },
          type: QueryTypes.SELECT,
        }
      );

      expect(result).toBe(fakeResults);
    });

    it("dovrebbe restituire array vuoto se nessun ristorante rientra nel raggio", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      const result = await RestaurantRepository.searchByPosition(40, 14, 5);

      expect(sequelize.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se sequelize.query fallisce", async () => {
      (sequelize.query as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantRepository.searchByPosition(40, 14, 5)).rejects.toThrow("DB error");
      expect(sequelize.query).toHaveBeenCalledTimes(1);
    });

    it("limita radiusKm a 50 quando maggiore", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      await RestaurantRepository.searchByPosition(10, 10, 999);

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          replacements: expect.objectContaining({ radiusKm: 50 }),
        })
      );
    });
  });
  
});
