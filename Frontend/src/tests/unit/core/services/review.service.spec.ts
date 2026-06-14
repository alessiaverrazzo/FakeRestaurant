import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { ReviewService } from '@core/services/review.service';

// Mock HttpService
type HttpServiceMock = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('ReviewService — test principali', () => {
  let service: ReviewService;
  let http: HttpServiceMock;

  beforeEach(() => {
    http = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    service = new ReviewService(http as any);
  });

  // ----------------------------------------------------------------
  describe('validateId', () => {
    it('accetta numeri positivi e stringhe numeriche', () => {
      const fn = (service as any).validateId.bind(service);

      expect(fn(1)).toBe(1);
      expect(fn('10')).toBe(10);
    });

    it('rifiuta 0, negativi o non numerici', () => {
      const fn = (service as any).validateId.bind(service);

      const invalid = [0, -1, -5, 'abc', NaN, null, undefined];

      invalid.forEach(v => {
        expect(() => fn(v)).toThrow('Invalid ID');
      });
    });
  });

  // ----------------------------------------------------------------
  describe('sanitizeContent', () => {
    it('trimma, rimuove < > e taglia', () => {
      const fn = (service as any).sanitizeContent.bind(service);

      const res = fn('  <ciao> testo lungo ', 10);
      expect(res).toBe('ciao testo');
    });

    it('ritorna stringa vuota per falsy', () => {
      const fn = (service as any).sanitizeContent.bind(service);

      expect(fn('', 50)).toBe('');
      expect(fn(null, 50)).toBe('');
      expect(fn(undefined, 50)).toBe('');
    });
  });

  // ----------------------------------------------------------------
  describe('validateOrder', () => {
    it('accetta BEST / NEWEST / OLDEST', () => {
      const fn = (service as any).validateOrder.bind(service);

      expect(fn('BEST')).toBe('BEST');
      expect(fn('NEWEST')).toBe('NEWEST');
      expect(fn('OLDEST')).toBe('OLDEST');
    });

    it('fallback a BEST per invalid', () => {
      const fn = (service as any).validateOrder.bind(service);

      expect(fn('xxx')).toBe('BEST');
    });
  });

  // ----------------------------------------------------------------
  describe('safeMapReview', () => {
    it('mappa tutti i campi e anche le replies', () => {
      const fn = (service as any).safeMapReview.bind(service);

      const dto = {
        id: '10',
        user_id: '3',
        restaurant_id: '7',
        content: ' <ciao> ',
        parent_review_id: null,
        created_at: 'today',
        updated_at: 'now',
        upvotes: '5',
        downvotes: undefined,
        userVote: 1,
        user: { username: '<test>', icon_id: '4' },
        replies: [
          { id: 20, user_id: 9, restaurant_id: 7, content: 'hi' }
        ],
        restaurant_name: 'Risto',
      };

      const r = fn(dto);

      expect(r.id).toBe(10);
      expect(r.userId).toBe(3);
      expect(r.content).toBe('ciao');
      expect(r.replies.length).toBe(1);
      expect(r.user?.username).toBe('<test>');
    });

    it('gestisce valori mancanti', () => {
      const fn = (service as any).safeMapReview.bind(service);

      const r = fn({
        id: undefined,
        user_id: undefined,
        restaurant_id: undefined,
        content: undefined,
        replies: undefined
      });

      expect(r.id).toBe(0);
      expect(r.userId).toBe(0);
      expect(r.content).toBe('');
      expect(r.replies).toEqual([]);
    });

    it('usa fallback per user.username e user.icon_id mancanti', () => {
      const fn = (service as any).safeMapReview.bind(service);

      const r = fn({
        id: 1,
        user_id: 2,
        restaurant_id: 3,
        content: 'test',
        user: {},
      });

      expect(r.user).toEqual({
        username: '',
        iconId: 0,
      });
    });
  });

  // ----------------------------------------------------------------
  describe('getByRestaurantId', () => {
    it('valida id e order e chiama http.get', () => {
      http.get.mockReturnValue(of([]));

      service.getByRestaurantId(10, 'NEWEST').subscribe();

      expect(http.get).toHaveBeenCalledWith('reviews/restaurant/10?order=NEWEST');
    });

    it('usa BEST per order invalido', () => {
      http.get.mockReturnValue(of([]));

      service.getByRestaurantId(10, 'XXX' as any).subscribe();

      expect(http.get).toHaveBeenCalledWith('reviews/restaurant/10?order=BEST');
    });

    it('propaga errori http.get', () => {
      http.get.mockReturnValue(throwError(() => new Error('fail')));

      service.getByRestaurantId(10).subscribe({
        error: e => expect(e.message).toBe('fail'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('getById', () => {
    it('valida id, chiama endpoint e mappa', () => {
      http.get.mockReturnValue(of({ id: 5, user_id: 3 }));

      let out: any = null;

      service.getById(5).subscribe(r => (out = r));

      expect(http.get).toHaveBeenCalledWith('reviews/5');
      expect(out.id).toBe(5);
      expect(out.userId).toBe(3);
    });

    it('propaga errori http.get', () => {
      http.get.mockReturnValue(throwError(() => new Error('err')));

      service.getById(10).subscribe({
        error: e => expect(e.message).toBe('err'),
      });
    });

    it('lancia se id invalido', () => {
      expect(() => service.getById(0 as any)).toThrow('Invalid ID');
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('create', () => {
    it('valida tutti i campi, sanifica e POSTa', () => {
      http.post.mockReturnValue(of({ id: 1, user_id: 3, restaurant_id: 10 }));

      let out: any = null;

      service.create({
        restaurantId: 10,
        content: ' hi ',
        parentReviewId: null,
      }).subscribe(r => (out = r));

      expect(http.post).toHaveBeenCalledWith('reviews', {
        restaurant_id: 10,
        content: 'hi',
        parent_review_id: null,
      });

      expect(out.id).toBe(1);
    });

    it('valida parentReviewId', () => {
      http.post.mockReturnValue(of({}));

      service.create({
        restaurantId: 10,
        content: 'test',
        parentReviewId: 5,
      }).subscribe();

      expect(http.post).toHaveBeenCalled();
    });

    it('propaga errori http.post', () => {
      http.post.mockReturnValue(throwError(() => new Error('fail')));

      service.create({
        restaurantId: 10,
        content: 'hi',
        parentReviewId: null,
      }).subscribe({
        error: e => expect(e.message).toBe('fail'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('update', () => {
    it('valida id, sanifica e PUT', () => {
      http.put.mockReturnValue(of({ id: 3 }));

      let out: any;

      service.update({ id: 3, content: ' upd ' }).subscribe(r => (out = r));

      expect(http.put).toHaveBeenCalledWith('reviews/3', {
        content: 'upd',
      });

      expect(out.id).toBe(3);
    });

    it('propaga errori http.put', () => {
      http.put.mockReturnValue(throwError(() => new Error('err')));

      service.update({ id: 10, content: 'test' }).subscribe({
        error: e => expect(e.message).toBe('err'),
      });
    });

    it('lancia per id invalido', () => {
      expect(() => service.update({ id: -1, content: 'x' })).toThrow('Invalid ID');
      expect(http.put).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('delete', () => {
    it('valida id e chiama DELETE', () => {
      http.delete.mockReturnValue(of(void 0));

      let done = false;

      service.delete(5).subscribe(() => (done = true));

      expect(http.delete).toHaveBeenCalledWith('reviews/5');
      expect(done).toBe(true);
    });

    it('propaga errori http.delete', () => {
      http.delete.mockReturnValue(throwError(() => new Error('boom')));

      service.delete(7).subscribe({
        error: e => expect(e.message).toBe('boom'),
      });
    });

    it('lancia per id invalido', () => {
      expect(() => service.delete(0 as any)).toThrow('Invalid ID');
      expect(http.delete).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('getMyReviews', () => {
    it('chiama endpoint e mappa lista', () => {
      http.get.mockReturnValue(of([{ id: 1 }, { id: 2 }]));

      let list: any[] = [];

      service.getMyReviews().subscribe(l => (list = l));

      expect(http.get).toHaveBeenCalledWith('reviews/my-reviews');
      expect(list.length).toBe(2);
    });

    it('propaga errori', () => {
      http.get.mockReturnValue(throwError(() => new Error('fail')));

      service.getMyReviews().subscribe({
        error: e => expect(e.message).toBe('fail'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('getTop', () => {
    it('chiama endpoint e mappa lista', () => {
      http.get.mockReturnValue(of([{ id: 1 }]));

      service.getTop().subscribe();

      expect(http.get).toHaveBeenCalledWith('reviews/top');
    });

    it('propaga errori', () => {
      http.get.mockReturnValue(throwError(() => new Error('fail')));

      service.getTop().subscribe({
        error: e => expect(e.message).toBe('fail'),
      });
    });
  });

  // ----------------------------------------------------------------
  describe('voteReview', () => {
    it('POST e poi GET', () => {
      http.post.mockReturnValue(of({}));
      http.get.mockReturnValue(of({ id: 5 }));

      let out: any;

      service.voteReview(5, 1).subscribe(r => (out = r));

      expect(http.post).toHaveBeenCalledWith('votesReview', {
        review_id: 5,
        vote: 1,
      });

      expect(http.get).toHaveBeenCalledWith('reviews/5');
      expect(out.id).toBe(5);
    });

    it('propaga errori POST', () => {
      http.post.mockReturnValue(throwError(() => new Error('fail')));

      service.voteReview(5, 1).subscribe({
        error: e => expect(e.message).toBe('fail'),
      });
    });

    it('propaga errori GET successivo al POST', () => {
      http.post.mockReturnValue(of({}));
      http.get.mockReturnValue(throwError(() => new Error('fail-get')));

      service.voteReview(5, 1).subscribe({
        error: e => expect(e.message).toBe('fail-get'),
      });
    });

    it('lancia per id invalido', () => {
      expect(() => service.voteReview(0 as any, 1)).toThrow('Invalid ID');
      expect(http.post).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('getUserVote', () => {
    it('ritorna 1', () => {
      http.get.mockReturnValue(of({ vote: 1 }));

      let r: any = null;

      service.getUserVote(10).subscribe(v => (r = v));

      expect(http.get).toHaveBeenCalledWith('votesReview/user/10');
      expect(r).toBe(1);
    });

    it('ritorna -1', () => {
      http.get.mockReturnValue(of({ vote: -1 }));

      let r: any;

      service.getUserVote(3).subscribe(v => (r = v));

      expect(r).toBe(-1);
    });

    it('ritorna 0 per risposte invalide', () => {
      http.get.mockReturnValueOnce(of(null));
      service.getUserVote(1).subscribe(v => expect(v).toBe(0));

      http.get.mockReturnValueOnce(of({}));
      service.getUserVote(1).subscribe(v => expect(v).toBe(0));

      http.get.mockReturnValueOnce(of({ vote: 'aaa' as any }));
      service.getUserVote(1).subscribe(v => expect(v).toBe(0));
    });

    it('propaga errori http.get', () => {
      http.get.mockReturnValue(throwError(() => new Error('err')));

      service.getUserVote(10).subscribe({
        error: e => expect(e.message).toBe('err'),
      });
    });

    it('lancia per id invalido', () => {
      expect(() => service.getUserVote(0 as any)).toThrow('Invalid ID');
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('getVotesCount', () => {
    it('converte up/down', () => {
      http.get.mockReturnValue(of({ upvotes: '3', downvotes: undefined }));

      let out: any = null;

      service.getVotesCount(7).subscribe(r => (out = r));

      expect(http.get).toHaveBeenCalledWith('review-vote/count/7');
      expect(out.upvotes).toBe(3);
      expect(out.downvotes).toBe(0);
    });

    it('propaga errori', () => {
      http.get.mockReturnValue(throwError(() => new Error('boom')));

      service.getVotesCount(7).subscribe({
        error: e => expect(e.message).toBe('boom'),
      });
    });

    it('lancia per id invalido', () => {
      expect(() => service.getVotesCount(0 as any)).toThrow('Invalid ID');
      expect(http.get).not.toHaveBeenCalled();
    });

    it('usa 0 se upvotes è undefined o null', () => {
      http.get.mockReturnValueOnce(of({}));

      service.getVotesCount(5).subscribe(r => {
        expect(r.upvotes).toBe(0);
        expect(r.downvotes).toBe(0);
      });
    });
  });
});
