import VoteReviewRepository from "../../../src/repositories/VoteReviewRepository";
import VoteReview from "../../../src/models/VoteReview";

// Mock del modello Sequelize
jest.mock("../../../src/models/VoteReview");

describe("VoteReviewRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("dovrebbe salvare un nuovo voto e restituirlo", async () => {
      const fakeVote = new VoteReview();
      (fakeVote.save as jest.Mock) = jest.fn().mockResolvedValue(fakeVote);

      const result = await VoteReviewRepository.create(fakeVote);

      expect(fakeVote.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(fakeVote);
    });

    it("dovrebbe propagare un errore se il salvataggio fallisce", async () => {
      const fakeVote = new VoteReview();
      (fakeVote.save as jest.Mock) = jest.fn().mockRejectedValue(new Error("DB error"));

      await expect(VoteReviewRepository.create(fakeVote)).rejects.toThrow("DB error");
      expect(fakeVote.save).toHaveBeenCalledTimes(1);
    });

    it("dovrebbe restituire lo stesso oggetto passato dopo il save", async () => {
      const fakeVote = new VoteReview();
      (fakeVote.save as jest.Mock) = jest.fn().mockResolvedValue(fakeVote);

      const result = await VoteReviewRepository.create(fakeVote);

      expect(result).toBe(fakeVote);
    });
  });

  describe("update", () => {
    it("dovrebbe aggiornare un voto esistente e restituirlo", async () => {
      const existing = { id: 1, vote: 1, save: jest.fn().mockResolvedValue(true) } as unknown as VoteReview;
      (VoteReview.findByPk as jest.Mock).mockResolvedValue(existing);

      const voteToUpdate = { id: 1, vote: -1 } as VoteReview;
      const result = await VoteReviewRepository.update(voteToUpdate);

      expect(VoteReview.findByPk).toHaveBeenCalledWith(1);
      expect(existing.vote).toBe(-1);
      expect(existing.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(existing);
    });

    it("dovrebbe restituire null se il voto non esiste", async () => {
      (VoteReview.findByPk as jest.Mock).mockResolvedValue(null);

      const voteToUpdate = { id: 999, vote: 1 } as VoteReview;
      const result = await VoteReviewRepository.update(voteToUpdate);

      expect(VoteReview.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se il salvataggio fallisce", async () => {
      const existing = { id: 1, vote: 1, save: jest.fn().mockRejectedValue(new Error("DB error")) } as unknown as VoteReview;
      (VoteReview.findByPk as jest.Mock).mockResolvedValue(existing);

      const voteToUpdate = { id: 1, vote: -1 } as VoteReview;

      await expect(VoteReviewRepository.update(voteToUpdate)).rejects.toThrow("DB error");
      expect(existing.save).toHaveBeenCalledTimes(1);
      expect(VoteReview.findByPk).toHaveBeenCalledWith(1);
    });
  });

  describe("delete", () => {
    it("dovrebbe eliminare il voto se esiste e restituire true", async () => {
      (VoteReview.destroy as jest.Mock).mockResolvedValue(1); // 1 record eliminato

      const result = await VoteReviewRepository.delete(1, 2);

      expect(VoteReview.destroy).toHaveBeenCalledWith({
        where: { user_id: 1, review_id: 2 },
      });
      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se il voto non esiste", async () => {
      (VoteReview.destroy as jest.Mock).mockResolvedValue(0); // 0 record eliminati

      const result = await VoteReviewRepository.delete(1, 999);

      expect(VoteReview.destroy).toHaveBeenCalledWith({
        where: { user_id: 1, review_id: 999 },
      });
      expect(result).toBe(false);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (VoteReview.destroy as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(VoteReviewRepository.delete(1, 2)).rejects.toThrow("DB error");
      expect(VoteReview.destroy).toHaveBeenCalledWith({
        where: { user_id: 1, review_id: 2 },
      });
    });
  });

  describe("findByUserAndReview", () => {
    it("dovrebbe restituire il voto se esiste", async () => {
      const fakeVote = { user_id: 1, review_id: 2, vote: 1 } as VoteReview;
      (VoteReview.findOne as jest.Mock).mockResolvedValue(fakeVote);

      const result = await VoteReviewRepository.findByUserAndReview(1, 2);

      expect(VoteReview.findOne).toHaveBeenCalledWith({
        where: { user_id: 1, review_id: 2 },
      });
      expect(result).toBe(fakeVote);
    });

    it("dovrebbe restituire null se il voto non esiste", async () => {
      (VoteReview.findOne as jest.Mock).mockResolvedValue(null);

      const result = await VoteReviewRepository.findByUserAndReview(1, 999);

      expect(VoteReview.findOne).toHaveBeenCalledWith({
        where: { user_id: 1, review_id: 999 },
      });
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (VoteReview.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(VoteReviewRepository.findByUserAndReview(1, 2)).rejects.toThrow("DB error");
      expect(VoteReview.findOne).toHaveBeenCalledWith({
        where: { user_id: 1, review_id: 2 },
      });
    });
  });

  describe("getVotesByUser", () => {
    it("dovrebbe restituire tutti i voti dell'utente", async () => {
      const fakeVotes = [{ id: 1 }, { id: 2 }] as VoteReview[];
      (VoteReview.findAll as jest.Mock).mockResolvedValue(fakeVotes);

      const result = await VoteReviewRepository.getVotesByUser(1);

      expect(VoteReview.findAll).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(result).toBe(fakeVotes);
    });

    it("dovrebbe restituire un array vuoto se l'utente non ha voti", async () => {
      (VoteReview.findAll as jest.Mock).mockResolvedValue([]);

      const result = await VoteReviewRepository.getVotesByUser(1);

      expect(VoteReview.findAll).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(result).toEqual([]);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (VoteReview.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(VoteReviewRepository.getVotesByUser(1)).rejects.toThrow("DB error");
      expect(VoteReview.findAll).toHaveBeenCalledWith({ where: { user_id: 1 } });
    });
  });

  describe("getVotesCount", () => {
    it("dovrebbe restituire il numero di upvotes e downvotes", async () => {
      const fakeVotes = [
        { vote: 1 },
        { vote: -1 },
        { vote: 1 },
      ] as VoteReview[];

      (VoteReview.findAll as jest.Mock).mockResolvedValue(fakeVotes);

      const result = await VoteReviewRepository.getVotesCount(5);

      expect(VoteReview.findAll).toHaveBeenCalledWith({
        where: { review_id: 5 },
        attributes: ["vote"],
      });
      expect(result).toEqual({ upvotes: 2, downvotes: 1 });
    });

    it("dovrebbe restituire zero se non ci sono voti", async () => {
      (VoteReview.findAll as jest.Mock).mockResolvedValue([]);

      const result = await VoteReviewRepository.getVotesCount(5);

      expect(result).toEqual({ upvotes: 0, downvotes: 0 });
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (VoteReview.findAll as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(VoteReviewRepository.getVotesCount(5)).rejects.toThrow("DB error");
      expect(VoteReview.findAll).toHaveBeenCalledWith({
        where: { review_id: 5 },
        attributes: ["vote"],
      });
    });
  });
});
