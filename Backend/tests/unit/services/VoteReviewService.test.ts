import VoteReviewService from '../../../src/services/VoteReviewService';
import VoteReviewRepository from '../../../src/repositories/VoteReviewRepository';
import VoteReview from '../../../src/models/VoteReview';
import ReviewService from '../../../src/services/ReviewService';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/repositories/VoteReviewRepository');

// --- Mock ReviewService ---
jest.mock('../../../src/services/ReviewService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
  }
}));

// --- Mock di VoteReview.build ---
VoteReview.build = jest.fn((data: any) => ({
  ...data,
  save: jest.fn(),
  get: jest.fn((k: string) => data[k]),
}));

describe('VoteReviewService', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('vote', () => {
    it('dovrebbe lanciare un errore 404 se la recensione non esiste', async () => {
      (ReviewService.getById as jest.Mock).mockResolvedValue(null);

      await expect(VoteReviewService.vote(1, 999, 1))
        .rejects.toThrow(new AppError('Recensione non trovata', 404));
    });
    
    it('dovrebbe creare un nuovo voto se non esiste', async () => {
      (ReviewService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      (VoteReviewRepository.findByUserAndReview as jest.Mock)
        .mockResolvedValue(null);

      (VoteReviewRepository.create as jest.Mock)
        .mockResolvedValue(undefined);

      const result = await VoteReviewService.vote(1, 1, 1);

      expect(result.action).toBe('created');
      expect(result.vote.user_id).toBe(1);
      expect(result.vote.vote).toBe(1);
      expect(VoteReviewRepository.create).toHaveBeenCalled();
    });

    it('dovrebbe rimuovere il voto se il valore è lo stesso', async () => {
      (ReviewService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      const existing = VoteReview.build({ user_id: 1, review_id: 1, vote: 1 });
      (VoteReviewRepository.findByUserAndReview as jest.Mock)
        .mockResolvedValue(existing);

      (VoteReviewRepository.delete as jest.Mock).mockResolvedValue(undefined);

      const res = await VoteReviewService.vote(1, 1, 1);

      expect(res.action).toBe('deleted');
      expect(VoteReviewRepository.delete).toHaveBeenCalledWith(1, 1);
    });

    it('dovrebbe aggiornare il voto se il valore è diverso', async () => {
      (ReviewService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      const existing = VoteReview.build({ user_id: 1, review_id: 1, vote: -1 });
      (VoteReviewRepository.findByUserAndReview as jest.Mock)
        .mockResolvedValue(existing);

      (VoteReviewRepository.update as jest.Mock).mockResolvedValue(undefined);

      const res = await VoteReviewService.vote(1, 1, 1);

      expect(res.action).toBe('updated');
      expect(existing.vote).toBe(1);
      expect(VoteReviewRepository.update).toHaveBeenCalled();
    });
  });

  describe('getUserVote', () => {
    it('dovrebbe restituire il voto se esiste', async () => {
      const vote = VoteReview.build({ user_id: 1, review_id: 1, vote: 1 });

      (VoteReviewRepository.findByUserAndReview as jest.Mock)
        .mockResolvedValue(vote);

      const res = await VoteReviewService.getUserVote(1, 1);

      expect(res).toBe(vote);
    });

    it('dovrebbe restituire null se il voto non esiste', async () => {
      (VoteReviewRepository.findByUserAndReview as jest.Mock)
        .mockResolvedValue(null);

      expect(await VoteReviewService.getUserVote(1, 99)).toBeNull();
    });
  });

  describe('getVotesCount', () => {
    it('dovrebbe lanciare un errore 404 se la recensione non esiste', async () => {
      (ReviewService.getById as jest.Mock).mockResolvedValue(null);

      await expect(VoteReviewService.getVotesCount(999))
        .rejects.toThrow(new AppError('Recensione non trovata', 404));
    });
    
    it('dovrebbe restituire il conteggio dei voti', async () => {
      (ReviewService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      (VoteReviewRepository.getVotesCount as jest.Mock)
        .mockResolvedValue({ upvotes: 3, downvotes: 1 });

      const res = await VoteReviewService.getVotesCount(1);

      expect(res).toEqual({ upvotes: 3, downvotes: 1 });
    });

    it('dovrebbe propagare un errore del database', async () => {
      (ReviewService.getById as jest.Mock).mockResolvedValue({ id: 1 });

      (VoteReviewRepository.getVotesCount as jest.Mock)
        .mockRejectedValue(new Error('DB'));

      await expect(VoteReviewService.getVotesCount(1))
        .rejects.toThrow('DB');
    });
  });

});
