import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';
import { of } from 'rxjs';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
  };
});

import { ReviewThreadPageComponent } from
  '@features/reviews/review-tree/views/review-thread-page/review-thread-page.component';

function createRouteMock() {
  return {
    paramMap: of({
      get: (k: string) =>
        k === 'restaurantId' ? '10'
        : k === 'reviewId' ? '20'
        : null,
    }),
  };
}

function createRouterMock() {
  return {
    navigate: vi.fn(),
    currentNavigation: vi.fn(),
  };
}

describe('ReviewThreadPageComponent', () => {
  let comp: ReviewThreadPageComponent;
  let route: any;
  let router: any;

  beforeEach(() => {
    route = createRouteMock();
    router = createRouterMock();
  });

  // ----------------------------------------------------------------
  describe('Costruzione', () => {
    it("dovrebbe leggere restaurantId e reviewId dai parametri della route", () => {
      comp = new ReviewThreadPageComponent(route, router);
      expect(comp.restaurantId).toBe(10);
      expect(comp.startingReviewId).toBe(20);
    });

    it("dovrebbe leggere isLoggedIn e loggedUserId dallo stato di navigazione", () => {
      router.currentNavigation.mockReturnValue({
        extras: {
          state: {
            isLoggedIn: true,
            loggedUserId: 7,
          },
        },
      });
      comp = new ReviewThreadPageComponent(route, router);
      expect(comp.isLoggedIn).toBe(true);
      expect(comp.loggedUserId).toBe(7);
    });

    it("dovrebbe usare valori di default se lo stato di navigazione è assente", () => {
      router.currentNavigation.mockReturnValue(null);
      comp = new ReviewThreadPageComponent(route, router);
      expect(comp.isLoggedIn).toBe(false);
      expect(comp.loggedUserId).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('goBackToRestaurant', () => {
    it('dovrebbe navigare alla pagina del ristorante corrispondente', () => {
      comp = new ReviewThreadPageComponent(route, router);
      comp.goBackToRestaurant();
      expect(router.navigate).toHaveBeenCalledWith(['/restaurants', 10]);
    });
  });
});
