import ReviewRepository from "../../../src/repositories/ReviewRepository";
import { Review } from "../../../src/models/Review";
import { sequelize } from "../../../src/config/sequelize";
import { QueryTypes } from "sequelize";

// Mock User
jest.mock("../../../src/models/User", () => ({
  User: { init: jest.fn() },
}));

// Mock Review model
jest.mock("../../../src/models/Review", () => ({
  Review: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
    build: jest.fn((data) => ({
      ...data,
      isNewRecord: false,
      get: jest.fn((key?: string) => (key ? data[key] : data)),
    })),
  },
}));

// Mock VoteReview
jest.mock("../../../src/models/VoteReview", () => ({
  VoteReview: {},
}));

// Mock Restaurant
jest.mock("../../../src/models/Restaurant", () => ({
  Restaurant: {},
}));

// Mock sequelize.query
jest.mock("../../../src/config/sequelize", () => ({
  sequelize: { query: jest.fn() },
}));

describe("ReviewRepository", () => {
  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("dovrebbe chiamare save() e restituire la review", async () => {
      const mockReview = { save: jest.fn().mockResolvedValue(undefined) } as any;

      const result = await ReviewRepository.create(mockReview);

      expect(mockReview.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockReview);
    });

    it("dovrebbe propagare errori di save()", async () => {
      const mockReview = { save: jest.fn().mockRejectedValue(new Error("DB error")) } as any;

      await expect(ReviewRepository.create(mockReview)).rejects.toThrow("DB error");
    });

    it("dovrebbe funzionare anche con oggetto parziale", async () => {
      const mockReview = { content: "Test", save: jest.fn().mockResolvedValue(undefined) } as any;

      const result = await ReviewRepository.create(mockReview);

      expect(result.content).toBe("Test");
      expect(mockReview.save).toHaveBeenCalled();
    });

    it("non deve chiamare altri metodi", async () => {
      const mockReview = {
        content: "Test",
        save: jest.fn().mockResolvedValue(undefined),
        someOtherMethod: jest.fn(),
      } as any;

      await ReviewRepository.create(mockReview);

      expect(mockReview.save).toHaveBeenCalled();
      expect(mockReview.someOtherMethod).not.toHaveBeenCalled();
    });
  });

  describe("findByIdWithVotes", () => {
    it("dovrebbe restituire la review con voti", async () => {
      const reviewInstance = Review.build({
        id: 1,
        content: "Test",
        user_id: 2,
        restaurant_id: 3,
        parent_review_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      (Review.findOne as jest.Mock).mockResolvedValue(reviewInstance);

      const result = await ReviewRepository.findByIdWithVotes(1);

      expect(Review.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          attributes: expect.objectContaining({ include: expect.any(Array) }),
          include: expect.any(Array),
          group: expect.arrayContaining(["Review.id"]),
        })
      );

      expect(result.upvotes).toBeDefined();
      expect(result.downvotes).toBeDefined();
    });

    it("dovrebbe restituire null se non trovata", async () => {
      (Review.findOne as jest.Mock).mockResolvedValue(null);

      const result = await ReviewRepository.findByIdWithVotes(999);

      expect(result).toBeNull();
    });

    it("dovrebbe propagare errori", async () => {
      (Review.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(ReviewRepository.findByIdWithVotes(1)).rejects.toThrow("DB error");
    });
  });

  describe("findByUserId", () => {
    it("dovrebbe restituire recensioni con voti (default 0) e restaurant associato", async () => {
      const rows = [
        Review.build({
          id: 1,
          content: "A",
          user_id: 42,
          restaurant_id: 1,
          parent_review_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        }),
        Review.build({
          id: 2,
          content: "B",
          user_id: 42,
          restaurant_id: 1,
          parent_review_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      (Review.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await ReviewRepository.findByUserId(42);

      expect(Review.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 42 },
          attributes: expect.objectContaining({ include: expect.any(Array) }),
          include: expect.any(Array),
          group: ["Review.id", "restaurant.id"],  // FIX CORRETTO
          order: [["created_at", "ASC"]],
        })
      );

      expect(result[0].upvotes).toBe(0);
      expect(result[0].downvotes).toBe(0);
      expect(result.length).toBe(2);
    });

    it("dovrebbe restituire array vuoto se nessuna recensione", async () => {
      (Review.findAll as jest.Mock).mockResolvedValue([]);

      const result = await ReviewRepository.findByUserId(999);

      expect(result).toEqual([]);
    });

    it("dovrebbe propagare errori", async () => {
      (Review.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(ReviewRepository.findByUserId(1)).rejects.toThrow("DB error");
    });
  });

  describe("findByRestaurantIdWithVotes", () => {
    it("dovrebbe restituire recensioni con voti e user incorporato", async () => {
      const rows = [
        Review.build({
          id: 1,
          content: "A",
          user_id: 7,
          restaurant_id: 10,
          parent_review_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        }),
        Review.build({
          id: 2,
          content: "B",
          user_id: 7,
          restaurant_id: 10,
          parent_review_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      ];

      (Review.findAll as jest.Mock).mockResolvedValue(rows);

      const result = await ReviewRepository.findByRestaurantIdWithVotes(10);

      expect(Review.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ restaurant_id: 10 }),
          attributes: expect.objectContaining({ include: expect.any(Array) }),
          include: expect.any(Array),
          group: expect.arrayContaining([
            "Review.id",
            "user.id",
            "user.username",
            "user.icon_id",
          ]),
          order: [["created_at", "ASC"]],
        })
      );

      expect(result[0]).toHaveProperty("upvotes");
      expect(result[0]).toHaveProperty("downvotes");
      expect(result[0]).toHaveProperty("user");
    });

    it("dovrebbe restituire array vuoto se non ci sono recensioni", async () => {
      (Review.findAll as jest.Mock).mockResolvedValue([]);

      const result = await ReviewRepository.findByRestaurantIdWithVotes(999);

      expect(result).toEqual([]);
    });

    it("dovrebbe propagare errori", async () => {
      (Review.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        ReviewRepository.findByRestaurantIdWithVotes(1)
      ).rejects.toThrow("DB error");
    });
  });

  describe("update", () => {
    it("null se non esiste", async () => {
      (Review.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await ReviewRepository.update({ id: 999, content: "x" } as any);

      expect(result).toBeNull();
    });

    it("aggiorna contenuto", async () => {
      const existing = {
        id: 1,
        content: "old",
        save: jest.fn().mockResolvedValue(undefined),
      };

      (Review.findByPk as jest.Mock).mockResolvedValue(existing);

      const result = await ReviewRepository.update({ id: 1, content: "new" } as any);

      expect(existing.content).toBe("new");
      expect(existing.save).toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("propaga errori", async () => {
      const existing = {
        id: 1,
        save: jest.fn().mockRejectedValue(new Error("DB error")),
      };

      (Review.findByPk as jest.Mock).mockResolvedValue(existing);

      await expect(
        ReviewRepository.update({ id: 1, content: "fail" } as any)
      ).rejects.toThrow("DB error");
    });
  });

  describe("delete", () => {
    it("dovrebbe restituire true se eliminata", async () => {
      (Review.destroy as jest.Mock).mockResolvedValue(1);

      const result = await ReviewRepository.delete(42, 10);

      expect(Review.destroy).toHaveBeenCalledWith({
        where: { id: 42, user_id: 10 },
      });
      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se non eliminata", async () => {
      (Review.destroy as jest.Mock).mockResolvedValue(0);

      const result = await ReviewRepository.delete(42, 999);

      expect(Review.destroy).toHaveBeenCalledWith({
        where: { id: 42, user_id: 999 },
      });
      expect(result).toBe(false);
    });

    it("propaga errori", async () => {
      (Review.destroy as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(ReviewRepository.delete(42, 123)).rejects.toThrow("DB error");

      expect(Review.destroy).toHaveBeenCalledWith({
        where: { id: 42, user_id: 123 },
      });
    });
  });

  describe("findAllWithVotesBasic", () => {
    it("dovrebbe restituire tutte le recensioni con upvotes e downvotes numerici", async () => {
      const mockRows = [
        {
          id: 1,
          user_id: 2,
          restaurant_id: 3,
          content: "Recensione A",
          created_at: new Date(),
          updated_at: new Date(),
          restaurant_name: "Ristorante A",
          upvotes: 5,
          downvotes: 2,
        },
        {
          id: 2,
          user_id: 3,
          restaurant_id: 4,
          content: "Recensione B",
          created_at: new Date(),
          updated_at: new Date(),
          restaurant_name: "Ristorante B",
          upvotes: 0,
          downvotes: 0,
        },
      ];

      (sequelize.query as jest.Mock).mockResolvedValue([mockRows]);

      const result = await ReviewRepository.findAllWithVotesBasic();

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
      );

      expect(result.length).toBe(2);
      expect(result[0]).toMatchObject({
        id: 1,
        upvotes: 5,
        downvotes: 2,
        restaurant_name: "Ristorante A",
      });
      expect(result[1]).toMatchObject({
        id: 2,
        upvotes: 0,
        downvotes: 0,
        restaurant_name: "Ristorante B",
      });
    });

    it("dovrebbe restituire array vuoto se non ci sono recensioni", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([[]]);

      const result = await ReviewRepository.findAllWithVotesBasic();

      expect(result).toEqual([]);
      expect(sequelize.query).toHaveBeenCalled();
    });

    it("dovrebbe propagare errori se la query fallisce", async () => {
      (sequelize.query as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(ReviewRepository.findAllWithVotesBasic()).rejects.toThrow("DB error");
      expect(sequelize.query).toHaveBeenCalled();
    });
  });

  describe("findTopLevelByRestaurantId", () => {
    it("BEST default", async () => {
      const rows = [{ id: 1 }, { id: 2 }];

      (sequelize.query as jest.Mock).mockResolvedValue(rows);

      const result = await ReviewRepository.findTopLevelByRestaurantId(10);

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.objectContaining({
          replacements: { restaurant_id: 10, order: "BEST" },
          type: QueryTypes.SELECT,
        })
      );

      expect(result).toEqual([
        { id: 1, upvotes: 0, downvotes: 0 },
        { id: 2, upvotes: 0, downvotes: 0 },
      ]);
    });

    it("NEWEST", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([{ id: 1 }]);

      const result = await ReviewRepository.findTopLevelByRestaurantId(20, "NEWEST");

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("CASE WHEN :order = 'NEWEST' THEN r.created_at END DESC"),
        expect.objectContaining({
          replacements: { restaurant_id: 20, order: "NEWEST" },
        })
      );

      expect(result[0]).toEqual(expect.objectContaining({ id: 1 }));
    });

    it("OLDEST", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([{ id: 2 }]);

      const result = await ReviewRepository.findTopLevelByRestaurantId(30, "OLDEST");

      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("CASE WHEN :order = 'OLDEST' THEN r.created_at END ASC"),
        expect.any(Object)
      );

      expect(result[0]).toEqual(expect.objectContaining({ id: 2 }));
    });

    it("vuoto", async () => {
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      const result = await ReviewRepository.findTopLevelByRestaurantId(99);
      expect(result).toEqual([]);
    });

    it("propaga errori", async () => {
      (sequelize.query as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(
        ReviewRepository.findTopLevelByRestaurantId(50)
      ).rejects.toThrow("DB error");
    });
  });
});
