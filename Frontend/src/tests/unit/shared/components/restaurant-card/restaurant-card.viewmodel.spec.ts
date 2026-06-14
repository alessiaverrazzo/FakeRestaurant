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

import { RestaurantCardViewModel } from '@shared/components/restaurant-card/viewmodels/restaurant-card.viewmodel';
import { RestaurantCardModel } from '@shared/components/restaurant-card/models/restaurant-card.model';

describe('RestaurantCardViewModel', () => {
  let vm: RestaurantCardViewModel;

  let restaurantServiceMock: {
    getUserVote: ReturnType<typeof vi.fn>;
    voteRestaurant: ReturnType<typeof vi.fn>;
  };

  let authServiceMock: {
    isLoggedIn: ReturnType<typeof vi.fn>;
  };

  const baseRestaurant: RestaurantCardModel = {
    id: 1,
    name: 'Ristorante Test',
    description: 'Descrizione di test',
    imageUrl: null,
    latitude: 40,
    longitude: 14,
    upvotes: 10,
    downvotes: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    restaurantServiceMock = {
      getUserVote: vi.fn(),
      voteRestaurant: vi.fn(),
    };

    authServiceMock = {
      isLoggedIn: vi.fn(),
    };

    vm = new RestaurantCardViewModel(
      restaurantServiceMock as any,
      authServiceMock as any
    );
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare correttamente il viewmodel', () => {
      expect(vm).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('init', () => {
    it('dovrebbe impostare lo stato del ristorante e i voti iniziali', () => {
      authServiceMock.isLoggedIn.mockReturnValue(false);

      vm.init(baseRestaurant);

      expect(vm.restaurant()).toEqual(baseRestaurant);
      expect(vm.netUpvotes()).toBe(10);
      expect(vm.netDownvotes()).toBe(2);
      expect(vm.userVote()).toBe(0);
    });

    it("dovrebbe caricare il voto dell'utente se loggato", () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      restaurantServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ next }: any) => next(1),
      });

      vm.init(baseRestaurant);

      expect(restaurantServiceMock.getUserVote).toHaveBeenCalledWith(1);
      expect(vm.userVote()).toBe(1);
    });

    it('in caso di errore nel caricamento del voto, dovrebbe impostare voteError usando err.error.message', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      restaurantServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ error }: any) =>
          error({ error: { message: 'Errore voto' } }),
      });

      vm.init(baseRestaurant);

      expect(vm.voteError()).toBe('Errore voto');
    });

    it('in caso di errore nel caricamento del voto, dovrebbe usare err.message come fallback', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      restaurantServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ error }: any) => error({ message: 'Errore generico' }),
      });

      vm.init(baseRestaurant);

      expect(vm.voteError()).toBe('Errore generico');
    });

    it('in caso di errore nel caricamento del voto, dovrebbe usare un messaggio di default', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);

      restaurantServiceMock.getUserVote.mockReturnValue({
        subscribe: ({ error }: any) => error({}),
      });

      vm.init(baseRestaurant);

      expect(vm.voteError()).toBe('Si è verificato un errore. Riprova più tardi.');
    });
  });

  // ----------------------------------------------------------------
  describe('vote', () => {
    it('non dovrebbe eseguire il voto se il ristorante non è inizializzato', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      vm.vote(1);
      expect(restaurantServiceMock.voteRestaurant).not.toHaveBeenCalled();
    });

    it("non dovrebbe eseguire il voto se l'utente non è loggato", () => {
      authServiceMock.isLoggedIn.mockReturnValue(false);
      vm.init(baseRestaurant);
      vm.vote(1);
      expect(restaurantServiceMock.voteRestaurant).not.toHaveBeenCalled();
    });

    it("non dovrebbe eseguire il voto se l'id del ristorante non è valido (<= 0)", () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      restaurantServiceMock.getUserVote.mockReturnValue({ subscribe: () => {} });
      vm.init({ ...baseRestaurant, id: 0 });
      vm.vote(1);
      expect(restaurantServiceMock.voteRestaurant).not.toHaveBeenCalled();
    });

    it("non dovrebbe eseguire il voto se l'id del ristorante non è un intero", () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      restaurantServiceMock.getUserVote.mockReturnValue({ subscribe: () => {} });
      vm.init({ ...baseRestaurant, id: 1.5 });
      vm.vote(1);
      expect(restaurantServiceMock.voteRestaurant).not.toHaveBeenCalled();
    });

    it('dovrebbe aggiornare i voti e lo stato del voto utente in caso di nuovo voto', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      restaurantServiceMock.getUserVote.mockReturnValue({
        subscribe: () => {},
      });
      const updated = {
        ...baseRestaurant,
        upvotes: 11,
        downvotes: 2,
      };
      restaurantServiceMock.voteRestaurant.mockReturnValue({
        subscribe: ({ next }: any) => next(updated),
      });

      vm.init(baseRestaurant);
      vm.vote(1);

      expect(restaurantServiceMock.voteRestaurant).toHaveBeenCalledWith(1, 1);
      expect(vm.netUpvotes()).toBe(11);
      expect(vm.netDownvotes()).toBe(2);
      expect(vm.userVote()).toBe(1);
    });

    it("dovrebbe annullare il voto se l'utente vota di nuovo nello stesso modo", () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      restaurantServiceMock.getUserVote.mockReturnValue({
        subscribe: () => {},
      });
      restaurantServiceMock.voteRestaurant.mockReturnValue({
        subscribe: ({ next }: any) =>
        next({ ...baseRestaurant, upvotes: 10, downvotes: 2 }),
      });

      vm.init(baseRestaurant);
      (vm as any).userVoteState.set(1);
      vm.vote(1);

      expect(vm.userVote()).toBe(0);
    });

    it('dovrebbe ripristinare lo stato precedente (rollback) e impostare un errore in caso di fallimento', () => {
      authServiceMock.isLoggedIn.mockReturnValue(true);
      restaurantServiceMock.getUserVote.mockReturnValue({ subscribe: () => {} });
      restaurantServiceMock.voteRestaurant.mockReturnValue({
        subscribe: ({ error }: any) =>
        error({ message: 'Errore server' }),
      });

      vm.init(baseRestaurant);
      vm.vote(1);

      expect(vm.netUpvotes()).toBe(10);
      expect(vm.netDownvotes()).toBe(2);
      expect(vm.voteError()).toBe('Errore server');
    });
  });

  // ----------------------------------------------------------------
  describe('shortDescription (proprietà calcolata)', () => {
    it('dovrebbe restituire una stringa vuota se il ristorante è nullo', () => {
      expect(vm.shortDescription).toBe('');
    });

    it('dovrebbe normalizzare gli spazi nella descrizione', () => {
      vm.init({ ...baseRestaurant, description: ' Testo    con   spazi ' });
      expect(vm.shortDescription).toBe('Testo con spazi');
    });

    it('dovrebbe troncare la descrizione se supera i 150 caratteri', () => {
      const longText = 'a'.repeat(200);
      vm.init({ ...baseRestaurant, description: longText });
      expect(vm.shortDescription.length).toBe(151);
      expect(vm.shortDescription.endsWith('…')).toBe(true);
    });

    it('dovrebbe restituire una stringa vuota se la descrizione è nulla o non definita', () => {
      authServiceMock.isLoggedIn.mockReturnValue(false);
      vm.init({ ...(baseRestaurant as any), description: undefined });
      expect(vm.shortDescription).toBe('');
    });
  });
});
