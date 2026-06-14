import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Injectable: () => (cls: any) => cls,

    inject: () => ({}),
  };
});

import { HomeComponent } from '@features/home/views/home.component';

// Mock dei servizi
function createReviewServiceMock() {
  return {
    getTop: vi.fn(),
  };
}

function createRestaurantServiceMock() {
  return {
    getTop: vi.fn(),
    getFlop: vi.fn(),
  };
}

function createRouterMock() {
  return {
    navigate: vi.fn(),
  };
}

describe('HomeComponent', () => {
  let comp: HomeComponent;
  let reviewService: any;
  let restaurantService: any;
  let router: any;

  beforeEach(() => {
    reviewService = createReviewServiceMock();
    restaurantService = createRestaurantServiceMock();
    router = createRouterMock();

    comp = new HomeComponent() as any;

    (comp as any).reviewService = reviewService;
    (comp as any).restaurantService = restaurantService;
    (comp as any).router = router;
  });

  // ----------------------------------------------------------------
  describe('ngOnInit', () => {
    it('dovrebbe chiamare loadHomepage per avviare il caricamento dei dati', () => {
      reviewService.getTop.mockReturnValue(of([]));
      restaurantService.getTop.mockReturnValue(of([]));
      restaurantService.getFlop.mockReturnValue(of([]));

      comp.ngOnInit();

      expect(reviewService.getTop).toHaveBeenCalledTimes(1);
      expect(restaurantService.getTop).toHaveBeenCalledTimes(1);
      expect(restaurantService.getFlop).toHaveBeenCalledTimes(1);
    });
  });

  // ----------------------------------------------------------------
  describe('loadHomepage', () => {
    it('dovrebbe popolare correttamente le liste e impostare loading a false', () => {
      const mockReviews = [
        {
          id: 1,
          restaurantId: 10,
          restaurantName: 'A',
          content: 'aaa',
          upvotes: 5,
          downvotes: 1,
          createdAt: '2024-01-01',
          user: { id: 1, name: 'x' },
          userVote: 1,
        },
      ];

      const mockTopRated = [{ id: 2, name: 'Top' }];
      const mockFalling = [{ id: 3, name: 'Flop' }];

      reviewService.getTop.mockReturnValue(of(mockReviews));
      restaurantService.getTop.mockReturnValue(of(mockTopRated));
      restaurantService.getFlop.mockReturnValue(of(mockFalling));

      comp.loadHomepage();

      expect(comp.bestReviews.length).toBe(1);
      expect(comp.topRated).toEqual(mockTopRated);
      expect(comp.fallingStars).toEqual(mockFalling);
      expect(comp.loading).toBe(false);
      expect(comp.error).toBeNull();
    });

    it('dovrebbe usare i valori di fallback (user=null, userVote=0) se mancanti', () => {
      const mockReviews = [
        {
          id: 1,
          restaurantId: 10,
          restaurantName: 'A',
          content: 'aaa',
          upvotes: 5,
          downvotes: 1,
          createdAt: '2024-01-01',
        },
      ];

      reviewService.getTop.mockReturnValue(of(mockReviews));
      restaurantService.getTop.mockReturnValue(of([]));
      restaurantService.getFlop.mockReturnValue(of([]));

      comp.loadHomepage();

      expect(comp.bestReviews[0].user).toBeNull();
      expect(comp.bestReviews[0].userVote).toBe(0);
    });

    it("dovrebbe salvare l'errore se la chiamata a getTop delle recensioni fallisce", () => {
      reviewService.getTop.mockReturnValue(
        throwError(() => ({ message: 'err1' }))
      );
      restaurantService.getTop.mockReturnValue(of([]));
      restaurantService.getFlop.mockReturnValue(of([]));

      comp.loadHomepage();

      expect(comp.error).toBe('err1');
    });

    it("dovrebbe salvare l'errore se la chiamata a getTop dei ristoranti fallisce", () => {
      reviewService.getTop.mockReturnValue(of([]));
      restaurantService.getTop.mockReturnValue(
        throwError(() => ({ message: 'err2' }))
      );
      restaurantService.getFlop.mockReturnValue(of([]));

      comp.loadHomepage();

      expect(comp.error).toBe('err2');
    });

    it("dovrebbe salvare l'errore se la chiamata a getFlop dei ristoranti fallisce", () => {
      reviewService.getTop.mockReturnValue(of([]));
      restaurantService.getTop.mockReturnValue(of([]));
      restaurantService.getFlop.mockReturnValue(
        throwError(() => ({ message: 'err3' }))
      );

      comp.loadHomepage();

      expect(comp.error).toBe('err3');
      expect(comp.loading).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('searchByName', () => {
    it('non dovrebbe navigare se la query di ricerca è vuota o contiene solo spazi', () => {
      comp.textQuery = '   ';
      comp.searchByName();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('dovrebbe navigare alla pagina di ricerca con i parametri corretti se la query è valida', () => {
      comp.textQuery = ' Pizza Top ';
      comp.searchByName();

      expect(router.navigate).toHaveBeenCalledWith(['/search'], {
        queryParams: { query: 'Pizza Top' },
      });
    });
  });

  // ----------------------------------------------------------------
  describe('onLocationSelected', () => {
    it('dovrebbe aggiornare la latitudine e la longitudine selezionate', () => {
      comp.onLocationSelected({ lat: 45.1, lng: 9.2 });
      expect(comp.selectedLat).toBe(45.1);
      expect(comp.selectedLng).toBe(9.2);
    });
  });

  // ----------------------------------------------------------------
  describe('onRadiusChanged', () => {
    it('dovrebbe aggiornare il raggio selezionato', () => {
      comp.onRadiusChanged(12);
      expect(comp.selectedRadius).toBe(12);
    });
  });

  // ----------------------------------------------------------------
  describe('searchByPosition', () => {
    it('non dovrebbe navigare se la latitudine o la longitudine non sono state selezionate', () => {
      comp.selectedLat = null;
      comp.selectedLng = null;

      comp.searchByPosition();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('dovrebbe navigare alla pagina di ricerca con i parametri di posizione corretti', () => {
      comp.selectedLat = 45.4;
      comp.selectedLng = 7.8;
      comp.selectedRadius = 6;

      comp.searchByPosition();

      expect(router.navigate).toHaveBeenCalledWith(['/search'], {
        queryParams: {
          lat: 45.4,
          lng: 7.8,
          radius: 6,
        },
      });
    });
  });
});
