import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: actual.signal,
    computed: actual.computed,
  };
});

import { ReviewCardViewModel } from '@shared/components/review-card/viewmodels/review-card.viewmodel';
import { ReviewCard } from '@shared/components/review-card/models/review-card.model';

describe('ReviewCardViewModel', () => {
  let vm: ReviewCardViewModel;

  let reviewServiceMock: {
    getUserVote: ReturnType<typeof vi.fn>;
    voteReview: ReturnType<typeof vi.fn>;
  };

  let authServiceMock: {
    isLoggedIn: ReturnType<typeof vi.fn>;
  };

  const baseReview: ReviewCard = {
    id: 10,
    restaurantId: 5,
    restaurantName: 'Ristorante Test',
    content: 'Recensione di test',
    upvotes: 3,
    downvotes: 1,
    userVote: 0,
    createdAt: '2025-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    reviewServiceMock = {
      getUserVote: vi.fn(),
      voteReview: vi.fn(),
    };

    authServiceMock = {
      isLoggedIn: vi.fn(),
    };

    vm = new ReviewCardViewModel(
      reviewServiceMock as any,
      authServiceMock as any
    );
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare il viewmodel', () => {
      expect(vm).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('init', () => {
    it('dovrebbe impostare i dati della recensione e i voti iniziali', () => {
      authServiceMock.isLoggedIn.mockReturnValue(false);

      vm.init(baseReview);

      expect(vm.reviewValue()).toEqual(baseReview);
      expect(vm.netUpvotes()).toBe(3);
      expect(vm.netDownvotes()).toBe(1);
      expect(vm.userVote()).toBe(0);
    });

    it('dovrebbe caricare il voto dell\'utente se loggato', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      reviewServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ next }: any) => next(1),
      });

      vm.init(baseReview);

      expect(reviewServiceMock.getUserVote).toHaveBeenCalledWith(10);
      expect(vm.userVote()).toBe(1);
      expect(vm.reviewValue()?.userVote).toBe(1);
    });

    it('dovrebbe impostare un errore se il caricamento del voto utente fallisce', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      reviewServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ error }: any) =>
          error({ error: { message: 'Errore voto' } }),
      });

      vm.init(baseReview);

      expect(vm.voteError()).toBe('Errore voto');
    });
  });

  // ----------------------------------------------------------------
  describe('vote', () => {
    it('non dovrebbe fare nulla se la recensione è nulla', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      vm.vote(1);

      expect(reviewServiceMock.voteReview).not.toHaveBeenCalled();
    });

    it('non dovrebbe fare nulla se l\'utente non è loggato', () => {
      authServiceMock.isLoggedIn.mockReturnValue(false);

      vm.init(baseReview);
      vm.vote(1);

      expect(reviewServiceMock.voteReview).not.toHaveBeenCalled();
    });

    it('non dovrebbe fare nulla se l\'id della recensione non è valido', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      reviewServiceMock.getUserVote.mockReturnValue({
        subscribe: () => {},
      });

      vm.init({ ...baseReview, id: 0 });
      vm.vote(1);

      expect(reviewServiceMock.voteReview).not.toHaveBeenCalled();
    });

    it('in caso di successo, dovrebbe aggiornare i voti e lo stato del voto utente', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      reviewServiceMock.getUserVote.mockReturnValue({ subscribe: () => {} });
      reviewServiceMock.voteReview.mockReturnValue({
        subscribe: ({ next }: any) =>
          next({
            upvotes: 4,
            downvotes: 1,
          }),
      });

      vm.init(baseReview);
      vm.vote(1);

      expect(reviewServiceMock.voteReview).toHaveBeenCalledWith(10, 1);
      expect(vm.netUpvotes()).toBe(4);
      expect(vm.netDownvotes()).toBe(1);
      expect(vm.userVote()).toBe(1);
      expect(vm.reviewValue()?.userVote).toBe(1);
    });

    it('dovrebbe annullare il voto se si vota di nuovo lo stesso tipo', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      reviewServiceMock.getUserVote.mockReturnValue({ subscribe: () => {} });
      reviewServiceMock.voteReview.mockReturnValue({
        subscribe: ({ next }: any) =>
          next({
            upvotes: 3,
            downvotes: 1,
          }),
      });

      vm.init(baseReview);
      (vm as any).userVoteState.set(1);

      vm.vote(1);

      expect(vm.userVote()).toBe(0);
      expect(vm.reviewValue()?.userVote).toBe(0);
    });

    it('dovrebbe fare il rollback e impostare un errore in caso di fallimento', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      reviewServiceMock.getUserVote.mockReturnValue({ subscribe: () => {} });
      reviewServiceMock.voteReview.mockReturnValue({
        subscribe: ({ error }: any) =>
          error({ message: 'Errore server' }),
      });

      vm.init(baseReview);
      vm.vote(1);

      expect(vm.netUpvotes()).toBe(3);
      expect(vm.netDownvotes()).toBe(1);
      expect(vm.userVote()).toBe(0);
      expect(vm.voteError()).toBe('Errore server');
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione errori (extractMessage)', () => {
    it('dovrebbe usare err.message come fallback', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      reviewServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ error }: any) => error({ message: 'Errore generico' }),
      });

      vm.init(baseReview);

      expect(vm.voteError()).toBe('Errore generico');
    });

    it('dovrebbe usare un messaggio di default se non è presente alcun messaggio di errore', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      reviewServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ error }: any) => error({}),
      });

      vm.init(baseReview);

      expect(vm.voteError()).toBe(
        'Si è verificato un errore. Riprova più tardi.'
      );
    });
  });
});
