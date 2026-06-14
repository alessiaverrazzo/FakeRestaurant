import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';
import { of, throwError } from 'rxjs';

// Mocks
let injectedServices: any = {};

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  function mockSignal<T>(initial: T) {
    let value = initial;
    const fn: any = () => value;
    fn.set = (v: T) => (value = v);
    fn.update = (cb: (v: T) => T) => (value = cb(value));
    return fn;
  }

  return {
    ...actual,
    inject: (token: any) => injectedServices[token.name],
    signal: mockSignal,
    computed: (fn: any) => {
      const wrapper: any = () => fn();
      return wrapper;
    },
  };
});

import { RestaurantDetailViewModel } from
  '@features/restaurants/restaurant-detail/viewmodels/restaurant-detail.viewmodel';

// Mock services
function createRestaurantServiceMock() {
  return {
    voteRestaurant: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createAuthMock() {
  return {
    isLoggedIn: vi.fn(),
    user: null,
  };
}

function createRouterMock() {
  return {
    navigate: vi.fn(),
  };
}

describe('RestaurantDetailViewModel', () => {

  let vm: RestaurantDetailViewModel;
  let restaurantService: any;
  let auth: any;
  let router: any;

  beforeEach(() => {
    restaurantService = createRestaurantServiceMock();
    auth = createAuthMock();
    router = createRouterMock();

    injectedServices = {
      RestaurantService: restaurantService,
      AuthService: auth,
      Router: router,
    };

    vm = new RestaurantDetailViewModel(
      router,
      restaurantService,
      auth
    );
  });

  // ----------------------------------------------------------------
  describe('init', () => {
    it('dovrebbe impostare restaurant, voti e campi di modifica', () => {
      const data: any = {
        id: 1,
        name: ' Test ',
        description: ' Desc ',
        upvotes: 5,
        downvotes: 2,
      };

      vm.init(data);

      expect(vm.restaurant()).toBe(data);
      expect(vm.netUpvotes()).toBe(5);
      expect(vm.netDownvotes()).toBe(2);
      expect(vm.editName()).toBe('Test');
      expect(vm.editDescription()).toBe('Desc');
    });
  });

  // ----------------------------------------------------------------
  describe('Proprietà calcolate (isOwner, loggedUserId)', () => {
    it("isOwner: dovrebbe essere false se manca il ristorante o l'utente", () => {
      auth.user = null;
      expect(vm.isOwner()).toBe(false);
    });

    it("isOwner: dovrebbe essere true se lo userId coincide", () => {
      auth.user = { id: 10 };
      vm.restaurant.set({ userId: 10 } as any);

      expect(vm.isOwner()).toBe(true);
    });

    it("loggedUserId: dovrebbe essere null se l'utente non è presente", () => {
      auth.user = null;

      expect(vm.loggedUserId).toBe(null);
    });

    it("loggedUserId: dovrebbe ritornare l'id se l'utente è presente", () => {
      auth.user = { id: 42 };

      expect(vm.loggedUserId).toBe(42);
    });
  });

  // ----------------------------------------------------------------
  describe('vote', () => {
    it('non dovrebbe fare nulla se il ristorante è nullo', () => {
      auth.isLoggedIn.mockReturnValue(true);

      vm.vote(1);

      expect(restaurantService.voteRestaurant).not.toHaveBeenCalled();
    });

    it("non dovrebbe fare nulla se l'utente non è loggato", () => {
      vm.restaurant.set({ id: 1 } as any);
      auth.isLoggedIn.mockReturnValue(false);

      vm.vote(1);

      expect(restaurantService.voteRestaurant).not.toHaveBeenCalled();
    });

    it('in caso di successo, dovrebbe aggiornare i voti e lo stato del voto utente', () => {
      vm.restaurant.set({ id: 1 } as any);
      vm.setUserVote(0);
      auth.isLoggedIn.mockReturnValue(true);
      restaurantService.voteRestaurant.mockReturnValue(
        of({ id: 1, upvotes: 10, downvotes: 1 })
      );

      vm.vote(1);

      expect(vm.userVote()).toBe(1);
      expect(vm.netUpvotes()).toBe(10);
    });

    it('se si ripete lo stesso voto, dovrebbe annullarlo', () => {
      vm.restaurant.set({ id: 1 } as any);
      vm.setUserVote(1);
      auth.isLoggedIn.mockReturnValue(true);
      restaurantService.voteRestaurant.mockReturnValue(
        of({ id: 1, upvotes: 5, downvotes: 0 })
      );

      vm.vote(1);

      expect(vm.userVote()).toBe(0);
    });

    it('in caso di errore, dovrebbe fare il rollback del voto e impostare un messaggio di errore', () => {
      vm.restaurant.set({ id: 1 } as any);
      vm.setUserVote(1);
      auth.isLoggedIn.mockReturnValue(true);
      restaurantService.voteRestaurant.mockReturnValue(
        throwError(() => ({ message: 'fail' }))
      );

      vm.vote(-1);

      expect(vm.userVote()).toBe(1);
      expect(vm.errorVote()).toBe('fail');
    });
  });

  // ----------------------------------------------------------------
  describe('Editing', () => {
    it('startEditing: dovrebbe impostare i campi e la modalità di modifica', () => {
      vm.restaurant.set({ name: 'A', description: 'B' } as any);

      vm.startEditing();

      expect(vm.editMode()).toBe(true);
      expect(vm.editName()).toBe('A');
    });

    it('startEditing: non dovrebbe fare nulla se il ristorante è nullo', () => {
      vm.restaurant.set(null);

      vm.startEditing();

      expect(vm.editMode()).toBe(false);
    });

    it("cancelEditing: dovrebbe resettare la modalità di modifica e l'errore", () => {
      vm.editMode.set(true);
      vm.errorUpdate.set('x');

      vm.cancelEditing();

      expect(vm.editMode()).toBe(false);
      expect(vm.errorUpdate()).toBe(null);
    });

    it('saveChanges: dovrebbe mostrare un errore se il nome non è valido', () => {
      vm.restaurant.set({ id: 1 } as any);
      vm.editName.set('');
      vm.editDescription.set('ok');

      vm.saveChanges();

      expect(vm.errorUpdate()).toContain('nome');
    });

    it('saveChanges: dovrebbe mostrare un errore se la descrizione non è valida', () => {
      vm.restaurant.set({ id: 1 } as any);
      vm.editName.set('ok');
      vm.editDescription.set('');

      vm.saveChanges();

      expect(vm.errorUpdate()).toContain('descrizione');
    });

    it('saveChanges: non dovrebbe fare nulla se il ristorante è nullo', () => {
      vm.restaurant.set(null);

      vm.saveChanges();

      expect(restaurantService.update).not.toHaveBeenCalled();
    });

    it('saveChanges: in caso di successo, dovrebbe aggiornare il ristorante', () => {
      vm.restaurant.set({ id: 1, username: 'u', iconId: 2 } as any);
      vm.editName.set('New');
      vm.editDescription.set('Desc');
      restaurantService.update.mockReturnValue(
        of({ name: 'New', description: 'Desc' })
      );

      vm.saveChanges();

      expect(vm.editMode()).toBe(false);
      expect(vm.loadingUpdate()).toBe(false);
      expect(vm.restaurant()?.username).toBe('u');
    });

    it('saveChanges: in caso di errore, dovrebbe impostare errorUpdate e loading a false', () => {
      vm.restaurant.set({ id: 1 } as any);
      vm.editName.set('Nome valido');
      vm.editDescription.set('Descrizione valida');
      restaurantService.update.mockReturnValue(
          throwError(() => ({ message: 'update fail' }))
      );

      vm.saveChanges();

      expect(vm.errorUpdate()).toBe('update fail');
      expect(vm.loadingUpdate()).toBe(false);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione descrizione (collapse/expand)', () => {
    it('needsCollapse: dovrebbe essere true se il testo è lungo', () => {
      vm.restaurant.set({ description: 'x'.repeat(400) } as any);
      expect(vm.needsCollapse()).toBe(true);
    });

    it('needsCollapse: dovrebbe essere false se il ristorante è nullo', () => {
      vm.restaurant.set(null);
      expect(vm.needsCollapse()).toBe(false);
    });

    it('visibleText: dovrebbe essere troncato quando non espanso', () => {
      vm.restaurant.set({ description: 'x'.repeat(400) } as any);
      expect(vm.visibleText().endsWith('…')).toBe(true);
    });

    it('visibleText: dovrebbe essere una stringa vuota se il ristorante è nullo', () => {
      vm.restaurant.set(null);
      expect(vm.visibleText()).toBe('');
    });

    it('visibleText: dovrebbe ritornare il testo completo se non necessita di collapse', () => {
      vm.restaurant.set({ description: 'corto' } as any);
      expect(vm.visibleText()).toBe('corto');
    });

    it('visibleText: dovrebbe ritornare il testo completo se espanso', () => {
      const longText = 'x'.repeat(400);
      vm.restaurant.set({ description: longText } as any);
      vm.expanded.set(true);
      expect(vm.visibleText()).toBe(longText);
    });

    it('toggleExpanded: dovrebbe alternare lo stato di espansione', () => {
      vm.expanded.set(false);
      vm.toggleExpanded();
      expect(vm.expanded()).toBe(true);
    });

    it('fullDescription: dovrebbe essere una stringa vuota se il ristorante è nullo', () => {
      vm.restaurant.set(null);
      expect(vm.fullDescription()).toBe('');
    });

    it('fullDescription: dovrebbe ritornare la descrizione se presente', () => {
      vm.restaurant.set({ description: 'ABC' } as any);
      expect(vm.fullDescription()).toBe('ABC');
    });
  });

  // ----------------------------------------------------------------
  describe('Cancellazione', () => {
    it('openDeleteModal e closeDeleteModal dovrebbero alternare la visibilità del modale', () => {
      vm.openDeleteModal();
      expect(vm.showDeleteModal()).toBe(true);

      vm.closeDeleteModal();
      expect(vm.showDeleteModal()).toBe(false);
    });

    it('confirmDelete: in caso di successo, dovrebbe navigare alla home', () => {
      vm.restaurant.set({ id: 1 } as any);
      restaurantService.delete.mockReturnValue(of({}));

      vm.confirmDelete();

      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('confirmDelete: in caso di errore, dovrebbe impostare errorUpdate', () => {
      vm.restaurant.set({ id: 1 } as any);
      restaurantService.delete.mockReturnValue(
        throwError(() => ({ message: 'err' }))
      );

      vm.confirmDelete();

      expect(vm.errorUpdate()).toBe('err');
    });

    it('confirmDelete: non dovrebbe chiamare il servizio se il ristorante è nullo', () => {
      vm.restaurant.set(null);
      vm.confirmDelete();
      expect(restaurantService.delete).not.toHaveBeenCalled();
    });
  });

  describe('Gestione errori (extractMessage)', () => {
    it('dovrebbe usare un messaggio di fallback se nessun messaggio di errore è presente', () => {
      vm.restaurant.set({ id: 1 } as any);
      restaurantService.voteRestaurant.mockReturnValue(throwError(() => ({})));
      auth.isLoggedIn.mockReturnValue(true);

      vm.vote(1);

      expect(vm.errorVote()).toBe('Si è verificato un errore. Riprova più tardi.');
    });

    it('dovrebbe usare err.error.message se presente', () => {
      vm.restaurant.set({ id: 1 } as any);
      auth.isLoggedIn.mockReturnValue(true);
      restaurantService.voteRestaurant.mockReturnValue(
          throwError(() => ({ error: { message: 'ERR_INNER' } }))
      );

      vm.vote(1);

      expect(vm.errorVote()).toBe('ERR_INNER');
    });
  });

  // ----------------------------------------------------------------
  describe('setHighlightParams', () => {
    it('dovrebbe impostare entrambi i segnali di highlight', () => {
      vm.setHighlightParams({
        highlightRootReviewId: 10,
        highlightReviewId: 20,
      });

      expect(vm.highlightRootReviewId()).toBe(10);
      expect(vm.highlightReviewId()).toBe(20);
    });
  });

});
