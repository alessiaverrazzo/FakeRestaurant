import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';

// Mock
let injectedServices: any = {};

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  function mockSignal(initial: any) {
    let value = initial;

    const getter: any = () => value;

    getter.set = (v: any) => (value = v);

    getter.asReadonly = () => {
        const ro: any = () => value;
        return ro;
    };

    return getter;
  }

  return {
    ...actual,

    inject: (token: any) => {
      return injectedServices[token.name];
    },

    signal: mockSignal,

    computed: (fn: any) => {
      const wrapper: any = () => fn();
      return wrapper;
    },
  };
});

import { ProfileViewModel } from '@features/profile/viewmodels/profile.viewmodel';

// Mock servizi
function createUserServiceMock() {
  return {
    getMe: vi.fn(),
  };
}

function createRestaurantServiceMock() {
  return {
    getMyRestaurants: vi.fn(),
  };
}

function createReviewServiceMock() {
  return {
    getMyReviews: vi.fn(),
  };
}

function fakeObservable(obj: any) {
  return {
    subscribe(observer: any) {
      if (obj.next) observer.next(obj.next);
      if (obj.error) observer.error(obj.error);
      if (obj.complete) observer.complete();
    }
  };
}

describe('ProfileViewModel', () => {

  let vm: ProfileViewModel;
  
  let userService: any;
  let restaurantService: any;
  let reviewService: any;

  beforeEach(() => {
    userService = createUserServiceMock();
    restaurantService = createRestaurantServiceMock();
    reviewService = createReviewServiceMock();

    injectedServices = {
      UserService: userService,
      RestaurantService: restaurantService,
      ReviewService: reviewService,
    };

    vm = new ProfileViewModel();
  });

  // ----------------------------------------------------------------
  describe('loadProfile', () => {
    it('dovrebbe impostare loading a true e resettare gli errori', () => {
      userService.getMe.mockReturnValue(fakeObservable({}));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({})); // << FIX

      vm.loadProfile();

      expect(vm.loading()).toBe(true);
      expect(vm.error()).toBe(null);
    });

    it("dovrebbe usare err.error.message per l'errore, se presente", () => {
      userService.getMe.mockReturnValue(fakeObservable({}));

      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));

      reviewService.getMyReviews.mockReturnValue(fakeObservable({
        error: {
          error: {
            message: 'ERR_NESTED'
          }
        }
      }));

      vm.loadProfile();

      expect(vm.error()).toBe('ERR_NESTED');
    });

    it("dovrebbe impostare l'utente in caso di successo di getMe", () => {
      userService.getMe.mockReturnValue(fakeObservable({ next: { id: 22 } }));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({ complete: true }));

      vm.loadProfile();

      expect(vm.user()).toEqual({ id: 22 });
    });

    it("dovrebbe impostare l'errore quando getMe fallisce", () => {
      userService.getMe.mockReturnValue(fakeObservable({
        error: { message: 'ERR_USER' }
      }));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({ complete: true }));

      vm.loadProfile();

      expect(vm.error()).toBe('ERR_USER');
    });

    it('dovrebbe impostare i ristoranti in caso di successo', () => {
      userService.getMe.mockReturnValue(fakeObservable({}));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({
        next: [{ id: 1, name: 'Pizzeria' }]
      }));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({ complete: true }));

      vm.loadProfile();

      expect(vm.restaurants()).toEqual([{ id: 1, name: 'Pizzeria' }]);
    });

    it('dovrebbe impostare un errore se getMyRestaurants fallisce', () => {
      userService.getMe.mockReturnValue(fakeObservable({}));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({
        error: { message: 'ERR_REST' }
      }));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({ complete: true }));

      vm.loadProfile();

      expect(vm.error()).toBe('ERR_REST');
    });

    it('dovrebbe mappare correttamente le recensioni', () => {
      const list = [
        {
          id: 1,
          restaurantId: 5,
          restaurantName: 'Test',
          content: 'Ottimo',
          upvotes: 10,
          downvotes: 1,
          userVote: null,
          user: null,
          createdAt: '2024',
        }
      ];

      userService.getMe.mockReturnValue(fakeObservable({}));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({
        next: list,
        complete: true,
      }));

      vm.loadProfile();

      expect(vm.reviews()).toEqual([{
        id: 1,
        restaurantId: 5,
        restaurantName: 'Test',
        content: 'Ottimo',
        upvotes: 10,
        downvotes: 1,
        userVote: 0,
        user: null,
        createdAt: '2024'
      }]);
    });

    it('dovrebbe impostare un errore se getMyReviews fallisce', () => {
      userService.getMe.mockReturnValue(fakeObservable({}));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({
        error: { message: 'ERR_REV' }
      }));

      vm.loadProfile();

      expect(vm.error()).toBe('ERR_REV');
    });

    it('dovrebbe usare un messaggio di fallback se non sono presenti messaggi di errore', () => {
      userService.getMe.mockReturnValue(fakeObservable({}));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));
      
      // Nessun next, nessun error.message: trigger fallback
      reviewService.getMyReviews.mockReturnValue(fakeObservable({
          error: {}
      }));

      vm.loadProfile();

      expect(vm.error()).toBe("Si è verificato un errore. Riprova più tardi.");
    });

    it('dovrebbe impostare loading a false al completamento', () => {
      userService.getMe.mockReturnValue(fakeObservable({}));
      restaurantService.getMyRestaurants.mockReturnValue(fakeObservable({}));
      reviewService.getMyReviews.mockReturnValue(fakeObservable({
        complete: true,
      }));

      vm.loadProfile();

      expect(vm.loading()).toBe(false);
    });
  });
});
