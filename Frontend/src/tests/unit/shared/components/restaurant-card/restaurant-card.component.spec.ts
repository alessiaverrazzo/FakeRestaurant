import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Input: () => () => {},
    OnInit: class {},
    inject: () => ({}),
  };
});

import { RestaurantCardComponent } from '@shared/components/restaurant-card/views/restaurant-card.component';
import { RestaurantCardModel } from '@shared/components/restaurant-card/models/restaurant-card.model';

describe('RestaurantCardComponent', () => {
  let component: RestaurantCardComponent;

  // Mock locali
  let initMock: ReturnType<typeof vi.fn>;
  let voteMock: ReturnType<typeof vi.fn>;
  let navigateMock: ReturnType<typeof vi.fn>;
  let restaurantSignalMock: ReturnType<typeof vi.fn>;

  const baseData: RestaurantCardModel = {
    id: 1,
    name: 'Ristorante Test',
    description: 'Descrizione test',
    imageUrl: null,
    latitude: 40,
    longitude: 14,
    upvotes: 10,
    downvotes: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    initMock = vi.fn();
    voteMock = vi.fn();
    navigateMock = vi.fn();

    let restaurantValue: any = null;
    restaurantSignalMock = vi.fn(() => restaurantValue);

    component = new RestaurantCardComponent({} as any);

    (component as any).router = {
      navigate: navigateMock,
    };

    component.vm = {
      init: initMock,
      vote: voteMock,
      restaurant: restaurantSignalMock,
    } as any;

    component.data = baseData;

    (component.vm.restaurant as any).set = (val: any) => {
      restaurantValue = val;
    };
  });

  // ----------------------------------------------------------------
  describe('Creazione e Inizializzazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });

    it('ngOnInit: dovrebbe inizializzare il viewmodel con i dati in input', () => {
      component.ngOnInit();

      expect(initMock).toHaveBeenCalledWith(baseData);
    });
  });

  // ----------------------------------------------------------------
  describe('Votazione', () => {
    it('voteUp: dovrebbe delegare il voto positivo (upvote) al viewmodel', () => {
      component.voteUp();

      expect(voteMock).toHaveBeenCalledWith(1);
    });

    it('voteDown: dovrebbe delegare il voto negativo (downvote) al viewmodel', () => {
      component.voteDown();

      expect(voteMock).toHaveBeenCalledWith(-1);
    });
  });

  // ----------------------------------------------------------------
  describe('goToDetails', () => {
    it('non dovrebbe navigare se il ristorante nel viewmodel è nullo', () => {
      (component.vm.restaurant as any).set(null);

      component.goToDetails();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("non dovrebbe navigare se l'id del ristorante è undefined", () => {
      (component.vm.restaurant as any).set({ id: undefined });

      component.goToDetails();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("non dovrebbe navigare se l'id del ristorante non è un intero", () => {
      (component.vm.restaurant as any).set({ id: 1.5 });

      component.goToDetails();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("non dovrebbe navigare se l'id del ristorante è minore o uguale a zero", () => {
      (component.vm.restaurant as any).set({ id: 0 });

      component.goToDetails();

      expect(navigateMock).not.toHaveBeenCalled();
    });

    it("dovrebbe navigare alla pagina di dettaglio del ristorante se l'id è valido", () => {
      (component.vm.restaurant as any).set({ id: 42 });

      component.goToDetails();

      expect(navigateMock).toHaveBeenCalledWith(['/restaurants', 42]);
    });
  });
});
