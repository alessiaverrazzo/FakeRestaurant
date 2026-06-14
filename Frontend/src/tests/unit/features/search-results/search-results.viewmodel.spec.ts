import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

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
      const wrap: any = () => fn();
      return wrap;
    }
  };
});

import { SearchResultsViewModel } from '@features/search-results/viewmodels/search-results.viewmodel';

// Mock RestaurantService
function createRestaurantServiceMock() {
  return {
    searchByName: vi.fn(),
    searchByPosition: vi.fn(),
  };
}

describe('SearchResultsViewModel', () => {

  let vm: SearchResultsViewModel;
  let restaurantService: any;

  beforeEach(() => {
    restaurantService = createRestaurantServiceMock();

    injectedServices = {
      RestaurantService: restaurantService,
    };

    vm = new SearchResultsViewModel();
  });

  // ----------------------------------------------------------------
  describe('searchByName', () => {
    it('dovrebbe impostare lo stato di caricamento e resettare gli errori', () => {
      restaurantService.searchByName.mockReturnValue({
          subscribe: () => {}
      });

      vm.searchByName('pizza');

      expect(vm.loading()).toBe(true);
      expect(vm.error()).toBe(null);
    });

    it('in caso di successo, dovrebbe impostare i risultati e resettare lo stato di caricamento', () => {
      restaurantService.searchByName.mockReturnValue(of([{ id: 1 }]));

      vm.searchByName('pizza');

      expect(vm.results()).toEqual([{ id: 1 }]);
      expect(vm.loading()).toBe(false);
    });

    it('in caso di errore, dovrebbe usare err.error.message se presente', () => {
      restaurantService.searchByName.mockReturnValue(
        throwError(() => ({ error: { message: 'err1' } }))
      );

      vm.searchByName('pizza');

      expect(vm.error()).toBe('err1');
      expect(vm.loading()).toBe(false);
    });

    it('in caso di errore, dovrebbe usare err.message come fallback', () => {
      restaurantService.searchByName.mockReturnValue(
        throwError(() => ({ message: 'err2' }))
      );

      vm.searchByName('pizza');

      expect(vm.error()).toBe('err2');
      expect(vm.loading()).toBe(false);
    });

    it('in caso di errore, dovrebbe usare un messaggio di default', () => {
      restaurantService.searchByName.mockReturnValue(
        throwError(() => ({}))
      );

      vm.searchByName('pizza');

      expect(vm.error()).toBe('Si è verificato un errore. Riprova più tardi.');
    });
  });

  // ----------------------------------------------------------------
  describe('searchByPosition', () => {
    it('dovrebbe impostare lo stato di caricamento e resettare gli errori', () => {
      restaurantService.searchByPosition.mockReturnValue({
          subscribe: () => {}
      });

      vm.searchByPosition(1, 2, 3);

      expect(vm.loading()).toBe(true);
      expect(vm.error()).toBe(null);
    });

    it('in caso di successo, dovrebbe impostare i risultati e resettare lo stato di caricamento', () => {
      restaurantService.searchByPosition.mockReturnValue(of([{ id: 5 }]));

      vm.searchByPosition(1, 2, 3);

      expect(vm.results()).toEqual([{ id: 5 }]);
      expect(vm.loading()).toBe(false);
    });

    it('in caso di errore, dovrebbe usare err.error.message se presente', () => {
      restaurantService.searchByPosition.mockReturnValue(
        throwError(() => ({ error: { message: 'pos1' } }))
      );

      vm.searchByPosition(1,2,3);

      expect(vm.error()).toBe('pos1');
    });

    it('in caso di errore, dovrebbe usare err.message come fallback', () => {
      restaurantService.searchByPosition.mockReturnValue(
        throwError(() => ({ message: 'pos2' }))
      );

      vm.searchByPosition(1,2,3);

      expect(vm.error()).toBe('pos2');
    });

    it('in caso di errore, dovrebbe usare un messaggio di default', () => {
      restaurantService.searchByPosition.mockReturnValue(
        throwError(() => ({}))
      );

      vm.searchByPosition(1,2,3);

      expect(vm.error()).toBe('Si è verificato un errore. Riprova più tardi.');
    });
  });
});
