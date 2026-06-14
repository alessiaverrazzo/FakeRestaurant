import RestaurantService from "../../../src/services/RestaurantService";
import RestaurantRepository from "../../../src/repositories/RestaurantRepository";
import Restaurant from "../../../src/models/Restaurant";
import { AppError } from "../../../src/utils/AppError";
import fs from "fs";

// Mock Repository
jest.mock("../../../src/repositories/RestaurantRepository");

// Helper per costruire un restaurant valido
const buildRestaurant = (overrides = {}) =>
  Restaurant.build({
    id: 1,
    user_id: 1,
    name: "TestName",
    description: "TestDesc",
    image_url: "img.jpg",
    latitude: 40.0,
    longitude: 14.0,
    ...overrides,
  });

describe("RestaurantService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("dovrebbe creare un ristorante", async () => {
      const rest = buildRestaurant();
      (RestaurantRepository.create as jest.Mock).mockResolvedValue(rest);

      const result = await RestaurantService.create(rest);

      expect(RestaurantRepository.create).toHaveBeenCalledWith(rest);
      expect(result).toBe(rest);
    });

    it("dovrebbe sanitizzare il nome", async () => {
      const rest = buildRestaurant({ name: "<b>Ciao</b>" });
      const returned = buildRestaurant({ name: "Ciao" });

      (RestaurantRepository.create as jest.Mock).mockResolvedValue(returned);

      const result = await RestaurantService.create(rest);
      expect(result.name).toBe("Ciao");
    });

    it("dovrebbe sanitizzare la descrizione", async () => {
      const rest = buildRestaurant({ description: "<script>x</script><i>Cibo</i>" });
      const returned = buildRestaurant({ description: "Cibo" });

      (RestaurantRepository.create as jest.Mock).mockResolvedValue(returned);

      const result = await RestaurantService.create(rest);
      expect(result.description).toBe("Cibo");
    });

    it("dovrebbe propagare errori del repository", async () => {
      const rest = buildRestaurant();
      (RestaurantRepository.create as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(RestaurantService.create(rest)).rejects.toThrow("DB error");
    });
  });

  describe("getById", () => {
    it("dovrebbe restituire un ristorante", async () => {
      const rest = buildRestaurant();
      (RestaurantRepository.findByIdWithUser as jest.Mock).mockResolvedValue(rest);

      const result = await RestaurantService.getById(1);
      expect(result).toBe(rest);
    });

    it("dovrebbe restituire null se non trovato", async () => {
      (RestaurantRepository.findByIdWithUser as jest.Mock).mockResolvedValue(null);

      const result = await RestaurantService.getById(999);
      expect(result).toBeNull();
    });
  });

  describe("getAll", () => {
    it("dovrebbe restituire tutti i ristoranti", async () => {
      const list = [buildRestaurant({ id: 1 }), buildRestaurant({ id: 2 })];
      (RestaurantRepository.findAll as jest.Mock).mockResolvedValue(list);

      const res = await RestaurantService.getAll();
      expect(res).toBe(list);
    });

    it("dovrebbe restituire un array vuoto se non ci sono ristoranti", async () => {
      (RestaurantRepository.findAll as jest.Mock).mockResolvedValue([]);

      const res = await RestaurantService.getAll();
      expect(res).toEqual([]);
    });
  });

  describe("getByUserId", () => {
    it("dovrebbe restituire ristoranti dell'utente", async () => {
      const list = [buildRestaurant({ id: 1 })];
      (RestaurantRepository.findByUserId as jest.Mock).mockResolvedValue(list);

      const res = await RestaurantService.getByUserId(1);
      expect(res).toBe(list);
    });

    it("dovrebbe restituire un array vuoto se l'utente non ha ristoranti", async () => {
      (RestaurantRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const res = await RestaurantService.getByUserId(99);
      expect(res).toEqual([]);
    });
  });

  describe("update", () => {
    it("dovrebbe aggiornare nome e descrizione", async () => {
      const original = buildRestaurant({ id: 1, user_id: 1 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(original);
      (RestaurantRepository.update as jest.Mock).mockImplementation(r => r);

      const data = { id: 1, userId: 1, name: "New", description: "NewDesc" };
      const result = await RestaurantService.update(data);

      expect(result.name).toBe("New");
      expect(result.description).toBe("NewDesc");
    });

    it("dovrebbe aggiornare solo il name", async () => {
      const original = buildRestaurant({ id: 1, user_id: 1 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(original);
      (RestaurantRepository.update as jest.Mock).mockImplementation(r => r);

      const result = await RestaurantService.update({ id: 1, userId: 1, name: "ABC" });

      expect(result.name).toBe("ABC");
      expect(result.description).toBe("TestDesc");
    });

    it("dovrebbe aggiornare solo description", async () => {
      const original = buildRestaurant({ id: 1, user_id: 1 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(original);
      (RestaurantRepository.update as jest.Mock).mockImplementation(r => r);

      const result = await RestaurantService.update({
        id: 1, userId: 1, description: "DESC"
      });

      expect(result.description).toBe("DESC");
    });

    it("dovrebbe aggiornare image_url", async () => {
      const original = buildRestaurant({ id: 1, user_id: 1 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(original);
      (RestaurantRepository.update as jest.Mock).mockImplementation(r => r);

      const result = await RestaurantService.update({
        id: 1, userId: 1, image_url: "newimg.jpg"
      });

      expect(result.image_url).toBe("newimg.jpg");
    });

    it("dovrebbe lanciare errore se non trovato", async () => {
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        RestaurantService.update({ id: 1, userId: 1, name: "X" })
      ).rejects.toThrow(new AppError("Restaurant not found", 404));
    });

    it("dovrebbe lanciare errore se non proprietario", async () => {
      const rest = buildRestaurant({ user_id: 99 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);

      await expect(
        RestaurantService.update({ id: 1, userId: 1, name: "X" })
      ).rejects.toThrow(new AppError("Non autorizzato", 403));
    });

    it("dovrebbe lanciare errore se nessun campo passato", async () => {
      const rest = buildRestaurant({ user_id: 1 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);

      await expect(
        RestaurantService.update({ id: 1, userId: 1 })
      ).rejects.toThrow(new AppError("At least one field required", 400));
    });
  });

  describe("delete", () => {
    it("dovrebbe eliminare un ristorante", async () => {
      const rest = buildRestaurant({ id: 1, user_id: 1 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);
      (RestaurantRepository.delete as jest.Mock).mockResolvedValue(true);

      await RestaurantService.delete({ restaurantId: 1, userId: 1 });
    });

    it("dovrebbe lanciare errore se non trovato", async () => {
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        RestaurantService.delete({ restaurantId: 99, userId: 1 })
      ).rejects.toThrow(new AppError("Ristorante non trovato", 404));
    });

    it("dovrebbe lanciare errore se non proprietario", async () => {
      const rest = buildRestaurant({ user_id: 2 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);

      await expect(
        RestaurantService.delete({ restaurantId: 1, userId: 1 })
      ).rejects.toThrow(new AppError("Non autorizzato", 403));
    });

    it("dovrebbe lanciare errore se delete fallisce", async () => {
      const rest = buildRestaurant({ user_id: 1 });
      (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);
      (RestaurantRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(
        RestaurantService.delete({ restaurantId: 1, userId: 1 })
      ).rejects.toThrow(new AppError("Cancellazione fallita", 500));
    });
  });

    describe("delete - gestione immagine", () => {
      let existsSyncSpy: jest.SpyInstance;
      let unlinkSyncSpy: jest.SpyInstance;

      beforeEach(() => {
        existsSyncSpy = jest.spyOn(fs, "existsSync");
        unlinkSyncSpy = jest.spyOn(fs, "unlinkSync");
      });

      afterEach(() => {
        existsSyncSpy.mockRestore();
        unlinkSyncSpy.mockRestore();
      });

      it("non deve fare nulla se filename è null", () => {
        // @ts-ignore: accesso a metodo privato per test
        RestaurantService.deleteImageFile(null);

        expect(existsSyncSpy).not.toHaveBeenCalled();
        expect(unlinkSyncSpy).not.toHaveBeenCalled();
      });

      it("non deve fare nulla se filename è stringa vuota", () => {
        // @ts-ignore: accesso a metodo privato per test
        RestaurantService.deleteImageFile("");

        expect(existsSyncSpy).not.toHaveBeenCalled();
        expect(unlinkSyncSpy).not.toHaveBeenCalled();
      });

      it("dovrebbe cancellare l'immagine se esiste", async () => {
        const rest = buildRestaurant({ id: 1, user_id: 1, image_url: "img.jpg" });

        (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);
        (RestaurantRepository.delete as jest.Mock).mockResolvedValue(true);

        existsSyncSpy.mockReturnValue(true);
        unlinkSyncSpy.mockImplementation(() => {});

        await RestaurantService.delete({ restaurantId: 1, userId: 1 });

        expect(existsSyncSpy).toHaveBeenCalledTimes(1);
        expect(unlinkSyncSpy).toHaveBeenCalledTimes(1);
      });

      it("non deve chiamare unlinkSync se il file non esiste", async () => {
        const rest = buildRestaurant({ id: 1, user_id: 1, image_url: "img.jpg" });

        (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);
        (RestaurantRepository.delete as jest.Mock).mockResolvedValue(true);

        existsSyncSpy.mockReturnValue(false);

        await RestaurantService.delete({ restaurantId: 1, userId: 1 });

        expect(existsSyncSpy).toHaveBeenCalledTimes(1);
        expect(unlinkSyncSpy).not.toHaveBeenCalled();
      });

      it("deve lanciare errore se unlinkSync fallisce", async () => {
        const rest = buildRestaurant({ id: 1, user_id: 1, image_url: "img.jpg" });

        (RestaurantRepository.findById as jest.Mock).mockResolvedValue(rest);

        existsSyncSpy.mockReturnValue(true);
        unlinkSyncSpy.mockImplementation(() => {
          throw new Error("FS ERROR");
        });

        await expect(
          RestaurantService.delete({ restaurantId: 1, userId: 1 })
        ).rejects.toThrow(new AppError("Errore durante la cancellazione dell'immagine.", 500));

        expect(RestaurantRepository.delete).not.toHaveBeenCalled();
      });
    });

  describe("wilsonScore", () => {
    it("dovrebbe calcolare correttamente con solo upvote", () => {
      expect(RestaurantService.wilsonScore(10, 0)).toBeCloseTo(0.7224598);
    });

    it("dovrebbe restituire 0 se non ci sono voti", () => {
      expect(RestaurantService.wilsonScore(0, 0)).toBe(0);
    });

    it("dovrebbe calcolare correttamente con voti misti", () => {
      expect(RestaurantService.wilsonScore(7, 3)).toBeCloseTo(0.3967732);
    });

    it("dovrebbe calcolare correttamente con z personalizzato", () => {
      expect(RestaurantService.wilsonScore(7, 3, 2.5)).toBeCloseTo(
        0.3286514
      );
    });
  });

  describe("getTopAllTime", () => {
    it("dovrebbe restituire un array vuoto se non ci sono ristoranti", async () => {
      (RestaurantRepository.findAllWithVotes as jest.Mock).mockResolvedValue([]);

      const res = await RestaurantService.getTopAllTime();
      expect(res).toEqual([]);
    });

    it("dovrebbe calcolare correttamente il wilson score e ordinare i ristoranti", async () => {
      const restaurants = [
        { id: 1, upvotes: 10, downvotes: 0, name: "A" },
        { id: 2, upvotes: 5, downvotes: 1, name: "B" },
        { id: 3, upvotes: 7, downvotes: 3, name: "C" },
      ];

      (RestaurantRepository.findAllWithVotes as jest.Mock).mockResolvedValue(restaurants);

      const result = await RestaurantService.getTopAllTime();

      expect(result.length).toBeLessThanOrEqual(5);

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].wilson_score).toBeGreaterThanOrEqual(result[i + 1].wilson_score);
      }

      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("upvotes");
      expect(result[0]).toHaveProperty("downvotes");
      expect(result[0]).toHaveProperty("wilson_score");
    });
  });

  describe("getFlopAllTime", () => {
    it("dovrebbe restituire un array vuoto se non ci sono ristoranti", async () => {
      (RestaurantRepository.findAllWithVotes as jest.Mock).mockResolvedValue([]);

      const res = await RestaurantService.getFlopAllTime();
      expect(res).toEqual([]);
    });

    it("dovrebbe calcolare correttamente il wilson score e ordinare i ristoranti dal punteggio più basso", async () => {
      const restaurants = [
        { id: 1, upvotes: 10, downvotes: 0, name: "A" },
        { id: 2, upvotes: 1, downvotes: 10, name: "B" },
        { id: 3, upvotes: 7, downvotes: 3, name: "C" },
      ];

      (RestaurantRepository.findAllWithVotes as jest.Mock).mockResolvedValue(restaurants);

      const result = await RestaurantService.getFlopAllTime();

      expect(result.length).toBeLessThanOrEqual(5);

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].wilson_score).toBeLessThanOrEqual(result[i + 1].wilson_score);
      }

      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("upvotes");
      expect(result[0]).toHaveProperty("downvotes");
      expect(result[0]).toHaveProperty("wilson_score");
    });
  });

  describe("getByIdWithVotes", () => {
    it("dovrebbe restituire il ristorante con i voti", async () => {
      const rest = buildRestaurant();
      (RestaurantRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(rest);

      const res = await RestaurantService.getByIdWithVotes(1);
      expect(res).toBe(rest);
    });

    it("dovrebbe lanciare un errore se il ristorante non viene trovato", async () => {
      (RestaurantRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(null);

      await expect(RestaurantService.getByIdWithVotes(10))
        .rejects.toThrow(new AppError("Ristorante non trovato", 404));
    });
  });

  describe("getAllWithVotes", () => {
    it("dovrebbe restituire un array vuoto se non ci sono ristoranti", async () => {
      (RestaurantRepository.findAllWithVotes as jest.Mock).mockResolvedValue([]);

      const res = await RestaurantService.getAllWithVotes();
      expect(res).toEqual([]);
    });

    it("dovrebbe restituire la lista dei ristoranti con i voti", async () => {
      const list = [buildRestaurant()];
      (RestaurantRepository.findAllWithVotes as jest.Mock).mockResolvedValue(list);

      const res = await RestaurantService.getAllWithVotes();
      expect(res).toBe(list);
    });
  });

  describe("searchByName", () => {
    it("dovrebbe effettuare la ricerca per nome", async () => {
      const list = [buildRestaurant()];
      (RestaurantRepository.searchByName as jest.Mock).mockResolvedValue(list);

      const res = await RestaurantService.searchByName("Pizza");
      expect(RestaurantRepository.searchByName).toHaveBeenCalledWith("Pizza");
      expect(res).toBe(list);
    });

    it("dovrebbe lanciare un errore se la query è vuota", async () => {
      await expect(RestaurantService.searchByName(""))
        .rejects.toThrow(new AppError("Inserisci un termine di ricerca.", 400));
    });
  });

  describe("searchByPosition", () => {
    it("dovrebbe effettuare la ricerca con valori validi", async () => {
      const list = [buildRestaurant()];
      (RestaurantRepository.searchByPosition as jest.Mock).mockResolvedValue(list);

      const res = await RestaurantService.searchByPosition(40, 14, 5);
      expect(res).toBe(list);
    });

    it("dovrebbe lanciare un errore se la latitudine non è valida", async () => {
      await expect(RestaurantService.searchByPosition(120, 14, 5))
        .rejects.toThrow(new AppError("Latitudine non valida", 400));
    });

    it("dovrebbe lanciare un errore se la longitudine non è valida", async () => {
      await expect(RestaurantService.searchByPosition(40, 200, 5))
        .rejects.toThrow(new AppError("Longitudine non valida", 400));
    });

    it("dovrebbe lanciare un errore se il raggio non è valido", async () => {
      await expect(RestaurantService.searchByPosition(40, 14, -1))
        .rejects.toThrow(new AppError("Raggio non valido", 400));
    });
  });
});
