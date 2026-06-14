/**
 * Mock per evitare che VoteRestaurantService importi realmente RestaurantService
 */
jest.mock("../../../src/services/RestaurantService", () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
  },
}));

jest.mock("../../../src/repositories/VoteRestaurantRepository");

import VoteRestaurantService from "../../../src/services/VoteRestaurantService";
import VoteRestaurantRepository from "../../../src/repositories/VoteRestaurantRepository";
import VoteRestaurant from "../../../src/models/VoteRestaurant";
import RestaurantService from "../../../src/services/RestaurantService";
import { AppError } from "../../../src/utils/AppError";

// --- Mock di VoteRestaurant.build ---
VoteRestaurant.build = jest.fn((data: any) => ({
  ...data,
  save: jest.fn(),
  get: jest.fn((k: string) => data[k]),
}));

describe("VoteRestaurantService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // helper
  const buildVote = (overrides = {}) =>
    VoteRestaurant.build({
      user_id: 1,
      restaurant_id: 1,
      vote: 1,
      ...overrides,
    });

  describe("vote", () => {
    it("dovrebbe creare un nuovo voto se non esiste", async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      (VoteRestaurantRepository.findByUserAndRestaurant as jest.Mock)
        .mockResolvedValue(null);

      (VoteRestaurantRepository.create as jest.Mock)
        .mockResolvedValue(undefined);

      const result = await VoteRestaurantService.vote(1, 1, 1);

      expect(result.action).toBe("created");
      expect(result.vote).toHaveProperty("user_id", 1);
      expect(result.vote).toHaveProperty("restaurant_id", 1);
      expect(result.vote).toHaveProperty("vote", 1);

      expect(VoteRestaurantRepository.create).toHaveBeenCalled();
    });

    it("dovrebbe cancellare il voto se l’utente ripete lo stesso voto", async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      const existing = buildVote({ vote: 1 });

      (VoteRestaurantRepository.findByUserAndRestaurant as jest.Mock)
        .mockResolvedValue(existing);

      (VoteRestaurantRepository.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await VoteRestaurantService.vote(1, 1, 1);

      expect(result.action).toBe("deleted");
      expect(VoteRestaurantRepository.delete).toHaveBeenCalledWith(1, 1);
    });

    it("dovrebbe aggiornare il voto se è diverso", async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      const existing = buildVote({ vote: 1 });

      (VoteRestaurantRepository.findByUserAndRestaurant as jest.Mock)
        .mockResolvedValue(existing);

      (VoteRestaurantRepository.update as jest.Mock)
        .mockResolvedValue(undefined);

      const result = await VoteRestaurantService.vote(1, 1, -1);

      expect(result.action).toBe("updated");
      expect(result.vote.vote).toBe(-1);
      expect(VoteRestaurantRepository.update).toHaveBeenCalled();
    });

    it("dovrebbe lanciare errore se il ristorante non esiste", async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue(null);

      await expect(VoteRestaurantService.vote(1, 999, 1))
        .rejects.toThrow(new AppError("Ristorante non trovato", 404));
    });
  });

  describe("getVotesCount", () => {
    it("dovrebbe restituire il conteggio", async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      (VoteRestaurantRepository.getVotesCountForRestaurant as jest.Mock)
        .mockResolvedValue({ upvotes: 3, downvotes: 1 });

      const result = await VoteRestaurantService.getVotesCount(1);

      expect(result).toEqual({ upvotes: 3, downvotes: 1 });
    });

    it("dovrebbe lanciare errore se ristorante non esiste", async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue(null);

      await expect(VoteRestaurantService.getVotesCount(99))
        .rejects.toThrow(new AppError("Ristorante non trovato", 404));
    });

    it("dovrebbe restituire 0/0 se nessun voto", async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      (VoteRestaurantRepository.getVotesCountForRestaurant as jest.Mock)
        .mockResolvedValue({ upvotes: 0, downvotes: 0 });

      const result = await VoteRestaurantService.getVotesCount(1);

      expect(result).toEqual({ upvotes: 0, downvotes: 0 });
    });
  });

  describe("getUserVote", () => {
    it("dovrebbe restituire voto esistente", async () => {
      const vote = buildVote();

      (VoteRestaurantRepository.findByUserAndRestaurant as jest.Mock)
        .mockResolvedValue(vote);

      const result = await VoteRestaurantService.getUserVote(1, 1);

      expect(result).toBe(vote);
    });

    it("dovrebbe restituire null se non ha votato", async () => {
      (VoteRestaurantRepository.findByUserAndRestaurant as jest.Mock)
        .mockResolvedValue(null);

      const result = await VoteRestaurantService.getUserVote(1, 2);

      expect(result).toBeNull();
    });
  });
});
