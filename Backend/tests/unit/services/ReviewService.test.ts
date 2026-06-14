jest.mock('../../../src/repositories/ReviewRepository');

jest.mock('../../../src/services/RestaurantService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn()
  }
}));

import ReviewService from '../../../src/services/ReviewService';
import RestaurantService from '../../../src/services/RestaurantService';
import ReviewRepository from '../../../src/repositories/ReviewRepository';
import { AppError } from '../../../src/utils/AppError';

describe('ReviewService', () => {

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('dovrebbe creare una recensione', async () => {
      const review = { id: 1, content: 'Ottimo!', user_id: 1 } as any;
      (ReviewRepository.create as jest.Mock).mockResolvedValue(review);

      const result = await ReviewService.create(review);

      expect(result).toEqual(review);
      expect(ReviewRepository.create).toHaveBeenCalledWith(review);
    });

    it('dovrebbe lanciare 400 se content è vuoto', async () => {
      const review = { content: '  ', user_id: 1 } as any;

      await expect(ReviewService.create(review))
        .rejects
        .toThrow(new AppError("Content cannot be empty", 400));
    });

    it('dovrebbe sanitizzare rimuovendo tag HTML e script', async () => {
      const review = {
        content: '<script>alert("x")</script><b>ciao</b>',
        user_id: 1
      } as any;

      const saved = { ...review, id: 1, content: 'ciao' };
      (ReviewRepository.create as jest.Mock).mockResolvedValue(saved);

      const result = await ReviewService.create(review);

      expect(result.content).toBe('ciao');
    });

    it('dovrebbe propagare un errore del database', async () => {
      const fakeReview = { content: 'Fallimento', user_id: 1 } as any;
      (ReviewRepository.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(ReviewService.create(fakeReview)).rejects.toThrow('DB error');
    });
  });

  describe('getById', () => {
    it('dovrebbe restituire la recensione se esiste', async () => {
      const review = { id: 1 } as any;
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(review);

      expect(await ReviewService.getById(1)).toEqual(review);
    });

    it('dovrebbe restituire null se la recensione non viene trovata', async () => {
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(null);

      expect(await ReviewService.getById(999)).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('dovrebbe restituire le recensioni dell\'utente', async () => {
      const reviews = [{ id: 1 }, { id: 2 }] as any[];
      (ReviewRepository.findByUserId as jest.Mock).mockResolvedValue(reviews);

      const result = await ReviewService.getByUserId(1);

      expect(result).toEqual(reviews);
    });

    it('dovrebbe restituire un array vuoto se non ci sono recensioni', async () => {
      (ReviewRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await ReviewService.getByUserId(2);
      expect(result).toEqual([]);
    });
  });

  describe('getTreeByRestaurantId', () => {
    it('dovrebbe delegare a getTopLevelTreeByRestaurantId', async () => {
      const spy = jest.spyOn(ReviewService, 'getTopLevelTreeByRestaurantId')
        .mockResolvedValue([{ id: 1 } as any]);

      const result = await ReviewService.getTreeByRestaurantId(123);

      expect(spy).toHaveBeenCalledWith(123, 'BEST');
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('getTreeById', () => {
    it('dovrebbe restituire null se la recensione non viene trovata', async () => {
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(null);

      expect(await ReviewService.getTreeById(99)).toBeNull();
    });

    it('dovrebbe restituire il nodo corretto', async () => {
      const base = { id: 1, restaurant_id: 10 } as any;
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(base);

      const tree = [{ id: 1, replies: [] }];
      jest.spyOn(ReviewService, 'getTreeByRestaurantId').mockResolvedValue(tree);

      const result = await ReviewService.getTreeById(1);
      expect(result).toEqual(tree[0]);
    });

    it('dovrebbe restituire null se il nodo non viene trovato nell\'albero', async () => {
      const base = { id: 99, restaurant_id: 10 } as any;
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(base);

      jest.spyOn(ReviewService, 'getTreeByRestaurantId')
        .mockResolvedValue([{ id: 1, replies: [] }]);

      const result = await ReviewService.getTreeById(99);
      expect(result).toBeNull();
    });

    it('dovrebbe trovare un nodo annidato', async () => {
      const base = { id: 2, restaurant_id: 10 } as any;
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(base);

      const tree = [
        { id: 1, replies: [{ id: 2, replies: [] }] }
      ];

      jest.spyOn(ReviewService, 'getTreeByRestaurantId').mockResolvedValue(tree);

      const result = await ReviewService.getTreeById(2);

      expect(result).toEqual({ id: 2, replies: [] });
    });
  });

  describe('update', () => {
    it('dovrebbe aggiornare la recensione se l\'utente è il proprietario', async () => {
      const fake = { id: 1, user_id: 1, content: 'Old' } as any;

      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(fake);
      (ReviewRepository.update as jest.Mock).mockImplementation(r => Promise.resolve(r));

      const data = { id: 1, content: 'New', userId: 1 };

      const result = await ReviewService.update(data);

      expect(result.content).toBe('New');
    });

    it('dovrebbe lanciare un errore 404 se la recensione non viene trovata', async () => {
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(null);

      await expect(
        ReviewService.update({ id: 99, content: 'x', userId: 1 })
      ).rejects.toThrow(new AppError("Recensione non trovata", 404));
    });

    it('dovrebbe lanciare un errore 403 se l\'utente non è il proprietario', async () => {
      const fake = { id: 1, user_id: 2 } as any;
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(fake);

      await expect(
        ReviewService.update({ id: 1, content: 'x', userId: 1 })
      ).rejects.toThrow(new AppError("Non autorizzato", 403));
    });

    it('dovrebbe lanciare un errore 400 se il contenuto è vuoto', async () => {
      const fake = { id: 1, user_id: 1, content: 'old' } as any;
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(fake);

      await expect(
        ReviewService.update({ id: 1, content: ' ', userId: 1 })
      ).rejects.toThrow(new AppError("Il contenuto della recensione non può essere vuoto", 400));
    });

    it('dovrebbe sanitizzare il contenuto aggiornato rimuovendo tag HTML e script', async () => {
      const fake = { id: 1, user_id: 1, content: 'Old content' } as any;
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(fake);
      (ReviewRepository.update as jest.Mock).mockImplementation(r => Promise.resolve(r));

      const data = { id: 1, content: '<script>alert("x")</script><b>Nuovo</b>', userId: 1 };

      const result = await ReviewService.update(data);

      expect(result.content).toBe('Nuovo');
    });
  });

  describe('delete', () => {
    it('dovrebbe eliminare la recensione se l\'utente è il proprietario', async () => {
      const fake = { id: 1, user_id: 1 } as any;

      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(fake);
      (ReviewRepository.delete as jest.Mock).mockResolvedValue(true);

      await expect(
        ReviewService.delete({ reviewId: 1, userId: 1 })
      ).resolves.toBeUndefined();
    });

    it('dovrebbe lanciare un errore 404 se la recensione non viene trovata', async () => {
      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(null);

      await expect(
        ReviewService.delete({ reviewId: 99, userId: 1 })
      ).rejects.toThrow(new AppError("Recensione non trovata", 404));
    });

    it('dovrebbe lanciare un errore 403 se l\'utente non è il proprietario', async () => {
      const fake = { id: 1, user_id: 2 } as any;

      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(fake);

      await expect(
        ReviewService.delete({ reviewId: 1, userId: 1 })
      ).rejects.toThrow(new AppError("Non autorizzato", 403));
    });

    it('dovrebbe lanciare un errore 500 se l\'eliminazione fallisce', async () => {
      const fake = { id: 1, user_id: 1 } as any;

      (ReviewRepository.findByIdWithVotes as jest.Mock).mockResolvedValue(fake);
      (ReviewRepository.delete as jest.Mock).mockResolvedValue(false);

      await expect(
        ReviewService.delete({ reviewId: 1, userId: 1 })
      ).rejects.toThrow(new AppError("Errore durante la cancellazione della recensione", 500));
    });
  });

  describe('wilsonScore', () => {
    it('dovrebbe restituire 0 se non ci sono voti', () => {
      expect(ReviewService.wilsonScore(0, 0)).toBe(0);
    });

    it('dovrebbe calcolare correttamente con solo upvotes', () => {
      expect(ReviewService.wilsonScore(10, 0)).toBe(0.7224598312333834);
    });

    it('dovrebbe calcolare correttamente con voti misti', () => {
      expect(ReviewService.wilsonScore(7, 3)).toBe(0.3967732199795652);
    });
  });

  describe('getTopAllTime', () => {
    it('dovrebbe restituire le prime 5 recensioni ordinate per Wilson score', async () => {
      const reviews = [
        { id: 1, upvotes: 10, downvotes: 2 },
        { id: 2, upvotes: 5, downvotes: 0 },
        { id: 3, upvotes: 7, downvotes: 3 },
        { id: 4, upvotes: 2, downvotes: 0 },
        { id: 5, upvotes: 1, downvotes: 0 },
        { id: 6, upvotes: 0, downvotes: 0 }
      ];

      (ReviewRepository.findAllWithVotesBasic as jest.Mock).mockResolvedValue(reviews);

      const top = await ReviewService.getTopAllTime();

      expect(top.length).toBeLessThanOrEqual(5);

      for (let i = 1; i < top.length; i++) {
        expect(top[i-1].wilson_score).toBeGreaterThanOrEqual(top[i].wilson_score);
      }
    });

    it('dovrebbe calcolare correttamente il wilson score per ciascuna recensione', async () => {
      const reviews = [
        { id: 1, upvotes: 10, downvotes: 0 },
        { id: 2, upvotes: 5, downvotes: 5 },
      ];

      (ReviewRepository.findAllWithVotesBasic as jest.Mock).mockResolvedValue(reviews);

      const top = await ReviewService.getTopAllTime();

      const wilson = (u: number, d: number) => ReviewService.wilsonScore(u, d);

      expect(top[0].wilson_score).toBeCloseTo(wilson(10, 0));
      expect(top[1].wilson_score).toBeCloseTo(wilson(5, 5));
    });

    it('dovrebbe restituire un array vuoto se non ci sono recensioni', async () => {
      (ReviewRepository.findAllWithVotesBasic as jest.Mock).mockResolvedValue([]);

      const top = await ReviewService.getTopAllTime();

      expect(top).toEqual([]);
    });

    it('dovrebbe gestire upvotes/downvotes undefined come 0', async () => {
      const reviews = [
        { id: 1, upvotes: undefined, downvotes: undefined },
        { id: 2, upvotes: 3, downvotes: undefined },
        { id: 3, upvotes: undefined, downvotes: 2 },
      ];

      (ReviewRepository.findAllWithVotesBasic as jest.Mock).mockResolvedValue(reviews);

      const top = await ReviewService.getTopAllTime();

      top.forEach(r => {
        expect(r.wilson_score).toBeDefined();
        expect(typeof r.wilson_score).toBe('number');
      });
    });

    it('dovrebbe propagare errori del repository', async () => {
      (ReviewRepository.findAllWithVotesBasic as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(ReviewService.getTopAllTime()).rejects.toThrow('DB error');
    });
  });

  describe('getTopLevelTreeByRestaurantId', () => {

    const fakeRestaurant = { id: 1 };

    const fakeReviews = [
      { id: 1, parent_review_id: null, upvotes: 10, downvotes: 2, created_at: new Date('2025-01-01') },
      { id: 2, parent_review_id: null, upvotes: 5, downvotes: 1, created_at: new Date('2025-01-02') },
      { id: 3, parent_review_id: 1,  upvotes: 3, downvotes: 0, created_at: new Date('2025-01-03') },
    ];

    beforeEach(() => {
      jest.spyOn(RestaurantService, 'getById').mockResolvedValue(fakeRestaurant as any);

      jest.spyOn(ReviewService, 'buildReviewTree').mockImplementation(async (all: any[]) => {
        const map: Record<number, any> = {};
        all.forEach(r => map[r.id] = { ...r, replies: [] });

        all.forEach(r => {
          if (r.parent_review_id && map[r.parent_review_id]) {
            map[r.parent_review_id].replies.push(map[r.id]);
          }
        });

        return Object.values(map).filter(r => r.parent_review_id === null);
      });
    });

    it('dovrebbe restituire un array vuoto se non ci sono recensioni principali', async () => {
      (ReviewRepository.findTopLevelByRestaurantId as jest.Mock).mockResolvedValue([]);
      (ReviewRepository.findByRestaurantIdWithVotes as jest.Mock).mockResolvedValue([]);

      const res = await ReviewService.getTopLevelTreeByRestaurantId(1);

      expect(res).toEqual([]);
    });

    it('dovrebbe ordinare per BEST (miglior punteggio)', async () => {
      const roots = fakeReviews.filter(r => r.parent_review_id === null);

      (ReviewRepository.findTopLevelByRestaurantId as jest.Mock).mockResolvedValue(roots);
      (ReviewRepository.findByRestaurantIdWithVotes as jest.Mock).mockResolvedValue(fakeReviews);

      const res = await ReviewService.getTopLevelTreeByRestaurantId(1);

      const expected = [...roots].sort(
        (a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
      );

      expect(res.map(r => r.id)).toEqual(expected.map(r => r.id));
    });

    it('dovrebbe ordinare per NEWEST (più recente)', async () => {
      const roots = fakeReviews.filter(r => r.parent_review_id === null);

      (ReviewRepository.findTopLevelByRestaurantId as jest.Mock).mockResolvedValue(roots);
      (ReviewRepository.findByRestaurantIdWithVotes as jest.Mock).mockResolvedValue(fakeReviews);

      const res = await ReviewService.getTopLevelTreeByRestaurantId(1, 'NEWEST');

      const expected = [...roots].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      expect(res.map(r => r.id)).toEqual(expected.map(r => r.id));
    });

    it('dovrebbe ordinare per OLDEST (meno recente)', async () => {
      const roots = fakeReviews.filter(r => r.parent_review_id === null);

      (ReviewRepository.findTopLevelByRestaurantId as jest.Mock).mockResolvedValue(roots);
      (ReviewRepository.findByRestaurantIdWithVotes as jest.Mock).mockResolvedValue(fakeReviews);

      const res = await ReviewService.getTopLevelTreeByRestaurantId(1, 'OLDEST');

      const expected = [...roots].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      expect(res.map(r => r.id)).toEqual(expected.map(r => r.id));
    });

    it('dovrebbe lanciare un errore 404 se il ristorante non viene trovato', async () => {
      (RestaurantService.getById as jest.Mock).mockResolvedValue(null);

      await expect(
        ReviewService.getTopLevelTreeByRestaurantId(999)
      ).rejects.toThrow(new AppError("Ristorante non trovato", 404));
    });

    it('dovrebbe usare BEST come fallback se l\'ordinamento non è valido', async () => {
      const roots = fakeReviews.filter(r => r.parent_review_id === null);

      (ReviewRepository.findTopLevelByRestaurantId as jest.Mock).mockResolvedValue(roots);
      (ReviewRepository.findByRestaurantIdWithVotes as jest.Mock).mockResolvedValue(fakeReviews);

      const spy = jest.spyOn(Array.prototype, 'sort');

      await ReviewService.getTopLevelTreeByRestaurantId(1, 'INVALID' as any);

      expect(spy).toHaveBeenCalled();
    });

    it("dovrebbe gestire il caso di un nodo mancante nell'albero", async () => {
      jest.spyOn(RestaurantService, "getById").mockResolvedValue(fakeRestaurant as any);

      (ReviewRepository.findTopLevelByRestaurantId as jest.Mock).mockResolvedValue([
        { id: 10, parent_review_id: null, created_at: new Date("2025-01-01") }
      ]);

      (ReviewRepository.findByRestaurantIdWithVotes as jest.Mock).mockResolvedValue([
        { id: 1, parent_review_id: null, created_at: new Date("2025-01-02") }
      ]);

      jest.spyOn(ReviewService, "buildReviewTree").mockResolvedValue([
        { id: 1, replies: [] }
      ]);

      const res = await ReviewService.getTopLevelTreeByRestaurantId(1);

      expect(res[0]).toEqual({
        id: 10,
        parent_review_id: null,
        created_at: new Date("2025-01-01"),
        replies: []
      });
    });

    it("dovrebbe gestire upvotes/downvotes undefined", async () => {
      jest.spyOn(RestaurantService, "getById").mockResolvedValue(fakeRestaurant as any);

      const roots = [
        { id: 1, parent_review_id: null, created_at: new Date(), upvotes: undefined, downvotes: undefined },
        { id: 2, parent_review_id: null, created_at: new Date(), upvotes: 5, downvotes: 0 }
      ];

      (ReviewRepository.findTopLevelByRestaurantId as jest.Mock).mockResolvedValue(roots);
      (ReviewRepository.findByRestaurantIdWithVotes as jest.Mock).mockResolvedValue(roots);

      jest.spyOn(ReviewService, "buildReviewTree").mockResolvedValue(
        roots.map(r => ({ ...r, replies: [] }))
      );

      const res = await ReviewService.getTopLevelTreeByRestaurantId(1, "BEST");

      expect(res[0].id).toBe(2);
      expect(res[1].id).toBe(1);
    });

  });

  describe('buildReviewTree', () => {
    it('dovrebbe restituire un array vuoto se non ci sono recensioni', async () => {
      expect(await ReviewService.buildReviewTree([])).toEqual([]);
    });

    it('dovrebbe nidificare correttamente padre e figlio', async () => {
      const arr = [
        { id: 1, parent_review_id: null, created_at: '2025-01-01' },
        { id: 2, parent_review_id: 1, created_at: '2025-01-02' }
      ];

      const tree = await ReviewService.buildReviewTree(arr);

      expect(tree.length).toBe(1);
      expect(tree[0].replies.length).toBe(1);
      expect(tree[0].replies[0].id).toBe(2);
    });

    it('dovrebbe supportare più livelli di nidificazione', async () => {
      const arr = [
        { id: 1, parent_review_id: null, created_at: '2025-01-01' },
        { id: 2, parent_review_id: 1, created_at: '2025-01-02' },
        { id: 3, parent_review_id: 2, created_at: '2025-01-03' }
      ];

      const tree = await ReviewService.buildReviewTree(arr);

      expect(tree[0].replies[0].replies[0].id).toBe(3);
    });

    it('dovrebbe impostare user a null quando lo username è assente', async () => {
      const arr = [
        {
          id: 1,
          content: "Test",
          user_id: 1,
          restaurant_id: 1,
          parent_review_id: null,
          created_at: "2025-01-01",
          upvotes: 0,
          downvotes: 0,
          username: undefined,
          icon_id: undefined
        }
      ];

      const tree = await ReviewService.buildReviewTree(arr);

      expect(tree[0].user).toBeNull();
    });

    it('dovrebbe ordinare le risposte per data crescente anche nei livelli profondi', async () => {
      const arr = [
        { id: 1, parent_review_id: null, created_at: "2025-01-03" },
        { id: 2, parent_review_id: 1, created_at: "2025-01-02" },
        { id: 3, parent_review_id: 1, created_at: "2025-01-01" }
      ];

      const tree = await ReviewService.buildReviewTree(arr);

      expect(tree[0].replies.map((r: any) => r.id)).toEqual([3, 2]);
    });
  });

});
