import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';
import { of } from 'rxjs';

// Mock
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
  };
});

import { RestaurantDetailComponent } from
  '@features/restaurants/restaurant-detail/views/restaurant-detail.component';

// Mocks
function createVmMock() {
  return {
    init: vi.fn(),
    setUserVote: vi.fn(),
    setHighlightParams: vi.fn(),
  };
}

function createRouteMock() {
  return {
    snapshot: {
      paramMap: {
        get: vi.fn(),
      },
    },
    paramMap: of({}),
    queryParamMap: of({
      get: vi.fn(),
    }),
  };
}

function createRestaurantServiceMock() {
  return {
    getById: vi.fn(),
    getUserVote: vi.fn(),
  };
}

function createAuthMock() {
  return {
    isLoggedIn: vi.fn(),
  };
}

describe('RestaurantDetailComponent (NO TestBed)', () => {
  let comp: RestaurantDetailComponent;
  let vm: any;
  let route: any;
  let restaurantService: any;
  let auth: any;

  beforeEach(() => {
    vm = createVmMock();
    route = createRouteMock();
    restaurantService = createRestaurantServiceMock();
    auth = createAuthMock();

    comp = new RestaurantDetailComponent(
      vm,
      route,
      {} as any,
      restaurantService,
      auth
    );
  });

  // ----------------------------------------------------------------
  describe('ngOnInit', () => {
    it('dovrebbe impostare i parametri di highlight quando presenti nei query params', () => {
      route.queryParamMap = of({
        get: (k: string) =>
          k === 'highlightRootReviewId' ? '10'
          : k === 'highlightReviewId' ? '20'
          : null,
      });

      route.paramMap = of({});

      comp.ngOnInit();

      expect(vm.setHighlightParams).toHaveBeenCalledWith({
        highlightRootReviewId: 10,
        highlightReviewId: 20,
      });
    });

    it('dovrebbe impostare i parametri di highlight a null quando assenti nei query params', () => {
      route.queryParamMap = of({
        get: () => null,
      });

      route.paramMap = of({});

      comp.ngOnInit();

      expect(vm.setHighlightParams).toHaveBeenCalledWith({
        highlightRootReviewId: null,
        highlightReviewId: null,
      });
    });

    it('dovrebbe sottoscrivere a paramMap e chiamare loadFromRoute', () => {
      const spy = vi.spyOn(comp, 'loadFromRoute');

      route.paramMap = of({});

      comp.ngOnInit();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadFromRoute', () => {
    it("non dovrebbe chiamare getById se l'id non è valido", () => {
      route.snapshot.paramMap.get.mockReturnValue(null);

      comp.loadFromRoute();

      expect(restaurantService.getById).not.toHaveBeenCalled();
    });

    it("dovrebbe chiamare getById e vm.init se l'id è valido", () => {
      const data = { id: 5 } as any;

      route.snapshot.paramMap.get.mockReturnValue('5');
      restaurantService.getById.mockReturnValue(of(data));
      auth.isLoggedIn.mockReturnValue(false);

      comp.loadFromRoute();

      expect(restaurantService.getById).toHaveBeenCalledWith(5);
      expect(vm.init).toHaveBeenCalledWith(data);
    });

    it("non dovrebbe chiamare getUserVote se l'utente non è loggato", () => {
      route.snapshot.paramMap.get.mockReturnValue('7');
      restaurantService.getById.mockReturnValue(of({ id: 7 }));
      auth.isLoggedIn.mockReturnValue(false);

      comp.loadFromRoute();

      expect(restaurantService.getUserVote).not.toHaveBeenCalled();
    });

    it("dovrebbe chiamare getUserVote e vm.setUserVote se l'utente è loggato", () => {
      route.snapshot.paramMap.get.mockReturnValue('3');
      restaurantService.getById.mockReturnValue(of({ id: 3 }));
      restaurantService.getUserVote.mockReturnValue(of(1));
      auth.isLoggedIn.mockReturnValue(true);

      comp.loadFromRoute();

      expect(restaurantService.getUserVote).toHaveBeenCalledWith(3);
      expect(vm.setUserVote).toHaveBeenCalledWith(1);
    });
  });
});
