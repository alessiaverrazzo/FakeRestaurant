import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Input: () => () => {},
    inject: () => ({}),
  };
});

import { ReviewCardComponent } from '@shared/components/review-card/views/review-card.component';
import { ReviewCard } from '@shared/components/review-card/models/review-card.model';

describe('ReviewCardComponent', () => {
  let component: ReviewCardComponent;


  let initMock: ReturnType<typeof vi.fn>;
  let voteMock: ReturnType<typeof vi.fn>;
  let reviewSignalMock: ReturnType<typeof vi.fn>;
  let reviewValueMock: ReturnType<typeof vi.fn>;
  let isLoggedInMock: ReturnType<typeof vi.fn>;
  let navigateMock: ReturnType<typeof vi.fn>;

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

    initMock = vi.fn();
    voteMock = vi.fn();
    navigateMock = vi.fn();
    isLoggedInMock = vi.fn(() => true);

    let reviewValue: ReviewCard | null = null;
    reviewSignalMock = vi.fn(() => reviewValue);
    reviewValueMock = vi.fn(() => reviewValue);

    component = new ReviewCardComponent({} as any, {} as any);

    (component as any).router = {
      navigate: navigateMock,
    };

    component.vm = {
      init: initMock,
      vote: voteMock,
      review: reviewSignalMock,
      reviewValue: reviewValueMock,
      isLoggedIn: isLoggedInMock,
    } as any;

    component.vmReview = component.vm.review;
    component.isLoggedIn = component.vm.isLoggedIn;

    (component.vm.review as any).set = (val: ReviewCard | null) => {
      reviewValue = val;
    };
  });

  // ----------------------------------------------------------------
  describe('Creazione e Inizializzazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });

    it('l\'assegnazione dell\'input "review" dovrebbe inizializzare il viewmodel', () => {
      component.review = baseReview;

      expect(initMock).toHaveBeenCalledWith(baseReview);
    });
  });

  // ----------------------------------------------------------------
  describe('Votazione', () => {
    it('onVote("up"): dovrebbe delegare il voto positivo (upvote) al viewmodel', () => {
      component.onVote('up');

      expect(voteMock).toHaveBeenCalledWith(1);
    });

    it('onVote("down"): dovrebbe delegare il voto negativo (downvote) al viewmodel', () => {
      component.onVote('down');

      expect(voteMock).toHaveBeenCalledWith(-1);
    });
  });

  // ----------------------------------------------------------------
  describe('Navigazione (onDiscover)', () => {
    it('non dovrebbe navigare se la recensione nel viewmodel è nulla', () => {
      (component.vm.review as any).set(null);

      component.onDiscover();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('non dovrebbe navigare se restaurantId è undefined', () => {
      (component.vm.review as any).set({} as any);

      component.onDiscover();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('non dovrebbe navigare se restaurantId non è un intero', () => {
      (component.vm.review as any).set({ restaurantId: 1.5 } as any);

      component.onDiscover();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('non dovrebbe navigare se restaurantId è minore o uguale a zero', () => {
      (component.vm.review as any).set({ restaurantId: 0 } as any);

      component.onDiscover();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it('dovrebbe navigare alla pagina del ristorante se restaurantId è valido', () => {
      (component.vm.review as any).set(baseReview);

      component.onDiscover();

      expect(navigateMock).toHaveBeenCalledWith(['/restaurants', 5]);
    });
  });
});
