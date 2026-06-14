import VoteRestaurantRepository from "../../../src/repositories/VoteRestaurantRepository";
import VoteRestaurant from "../../../src/models/VoteRestaurant";

// Mock del modello Sequelize
jest.mock("../../../src/models/VoteRestaurant");

describe("VoteRestaurantRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("dovrebbe salvare un nuovo voto e restituirlo", async () => {
      const fakeVote = new VoteRestaurant();
      (fakeVote.save as jest.Mock) = jest.fn().mockResolvedValue(fakeVote);

      const result = await VoteRestaurantRepository.create(fakeVote);

      expect(fakeVote.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(fakeVote);
    });

    it("dovrebbe propagare un errore se il salvataggio fallisce", async () => {
      const fakeVote = new VoteRestaurant();
      (fakeVote.save as jest.Mock) = jest.fn().mockRejectedValue(new Error("DB error"));

      await expect(VoteRestaurantRepository.create(fakeVote)).rejects.toThrow("DB error");
      expect(fakeVote.save).toHaveBeenCalledTimes(1);
    });

    it("dovrebbe restituire lo stesso oggetto passato dopo il save", async () => {
      const fakeVote = new VoteRestaurant();
      (fakeVote.save as jest.Mock) = jest.fn().mockResolvedValue(fakeVote);

      const result = await VoteRestaurantRepository.create(fakeVote);

      expect(result).toBe(fakeVote);
    });
  });

  describe("findByUserAndRestaurant", () => {
    it("dovrebbe restituire il voto se esiste", async () => {
      const fakeVote = { user_id: 1, restaurant_id: 2, vote: 1 } as VoteRestaurant;
      (VoteRestaurant.findOne as jest.Mock).mockResolvedValue(fakeVote);

      const result = await VoteRestaurantRepository.findByUserAndRestaurant(1, 2);

      expect(VoteRestaurant.findOne).toHaveBeenCalledWith({
        where: { user_id: 1, restaurant_id: 2 },
      });
      expect(result).toBe(fakeVote);
    });

    it("dovrebbe restituire null se il voto non esiste", async () => {
      (VoteRestaurant.findOne as jest.Mock).mockResolvedValue(null);

      const result = await VoteRestaurantRepository.findByUserAndRestaurant(1, 999);

      expect(VoteRestaurant.findOne).toHaveBeenCalledWith({
        where: { user_id: 1, restaurant_id: 999 },
      });
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (VoteRestaurant.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(VoteRestaurantRepository.findByUserAndRestaurant(1, 2)).rejects.toThrow("DB error");
      expect(VoteRestaurant.findOne).toHaveBeenCalledWith({
        where: { user_id: 1, restaurant_id: 2 },
      });
    });
  });

  describe("update", () => {
    it("dovrebbe aggiornare un voto esistente e restituirlo", async () => {
      const existing = { id: 1, vote: 1, save: jest.fn().mockResolvedValue(true) } as unknown as VoteRestaurant;
      (VoteRestaurant.findByPk as jest.Mock).mockResolvedValue(existing);

      const voteToUpdate = { id: 1, vote: -1 } as VoteRestaurant;
      const result = await VoteRestaurantRepository.update(voteToUpdate);

      expect(VoteRestaurant.findByPk).toHaveBeenCalledWith(1);
      expect(existing.vote).toBe(-1);
      expect(existing.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(existing);
    });

    it("dovrebbe restituire null se il voto non esiste", async () => {
      (VoteRestaurant.findByPk as jest.Mock).mockResolvedValue(null);

      const voteToUpdate = { id: 999, vote: 1 } as VoteRestaurant;
      const result = await VoteRestaurantRepository.update(voteToUpdate);

      expect(VoteRestaurant.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se il salvataggio fallisce", async () => {
      const existing = { id: 1, vote: 1, save: jest.fn().mockRejectedValue(new Error("DB error")) } as unknown as VoteRestaurant;
      (VoteRestaurant.findByPk as jest.Mock).mockResolvedValue(existing);

      const voteToUpdate = { id: 1, vote: -1 } as VoteRestaurant;

      await expect(VoteRestaurantRepository.update(voteToUpdate)).rejects.toThrow("DB error");
      expect(existing.save).toHaveBeenCalledTimes(1);
      expect(VoteRestaurant.findByPk).toHaveBeenCalledWith(1);
    });
  });

  describe("delete", () => {
    it("dovrebbe eliminare il voto se esiste", async () => {
      (VoteRestaurant.destroy as jest.Mock).mockResolvedValue(1); // 1 record eliminato

      const result = await VoteRestaurantRepository.delete(1, 2);

      expect(VoteRestaurant.destroy).toHaveBeenCalledWith({
        where: { user_id: 1, restaurant_id: 2 },
      });
      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se il voto non esiste", async () => {
      (VoteRestaurant.destroy as jest.Mock).mockResolvedValue(0); // 0 record eliminati

      const result = await VoteRestaurantRepository.delete(1, 999);

      expect(VoteRestaurant.destroy).toHaveBeenCalledWith({
        where: { user_id: 1, restaurant_id: 999 },
      });
      expect(result).toBe(false);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (VoteRestaurant.destroy as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(VoteRestaurantRepository.delete(1, 2)).rejects.toThrow("DB error");
      expect(VoteRestaurant.destroy).toHaveBeenCalledWith({
        where: { user_id: 1, restaurant_id: 2 },
      });
    });
  });

  describe("getVotesCountForRestaurant", () => {
    it("dovrebbe restituire il numero di upvotes e downvotes", async () => {
      const fakeVotes = [
        { vote: 1 },
        { vote: -1 },
        { vote: 1 },
      ] as VoteRestaurant[];
      (VoteRestaurant.findAll as jest.Mock).mockResolvedValue(fakeVotes);

      const result = await VoteRestaurantRepository.getVotesCountForRestaurant(5);

      expect(VoteRestaurant.findAll).toHaveBeenCalledWith({
        where: { restaurant_id: 5 },
        attributes: ['vote'],
      });
      expect(result).toEqual({ upvotes: 2, downvotes: 1 });
    });

    it("dovrebbe restituire zero se non ci sono voti", async () => {
      (VoteRestaurant.findAll as jest.Mock).mockResolvedValue([]);

      const result = await VoteRestaurantRepository.getVotesCountForRestaurant(5);

      expect(result).toEqual({ upvotes: 0, downvotes: 0 });
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (VoteRestaurant.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(VoteRestaurantRepository.getVotesCountForRestaurant(5)).rejects.toThrow("DB error");
    });
  });
});
