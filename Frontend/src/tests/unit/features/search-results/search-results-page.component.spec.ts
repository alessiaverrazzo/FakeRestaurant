import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@angular/compiler';

import { SearchResultsPageComponent } from '@features/search-results/views/search-results-page.component';

// Mock ActivatedRoute
function createRouteMock(params: any) {
  return {
    queryParams: {
      subscribe: (fn: any) => fn(params)
    }
  };
}

// Mock ViewModel
function createVmMock() {
  return {
    searchByName: vi.fn(),
    searchByPosition: vi.fn()
  };
}

describe('SearchResultsPageComponent', () => {

  let vm: any;
  let route: any;

  function createComponent(params: any): SearchResultsPageComponent {
    vm = createVmMock();
    route = createRouteMock(params);
    const comp = new SearchResultsPageComponent(vm, route);
    comp.ngOnInit();
    return comp;
  }

  // ----------------------------------------------------------------
  describe('Ricerca per nome', () => {
    it('dovrebbe sanificare la query e chiamare searchByName', () => {
      const c = createComponent({ query: '  pizza  ' });

      expect(vm.searchByName).toHaveBeenCalledWith('pizza');
      expect(c.title).toBe('Risultati per "pizza"');
    });

    it('dovrebbe usare un titolo di fallback se la query è vuota', () => {
      const c = createComponent({ query: '    ' });

      expect(vm.searchByName).toHaveBeenCalledWith('');
      expect(c.title).toBe('Risultati della ricerca');
    });
  });

  // ----------------------------------------------------------------
  describe('Ricerca per posizione', () => {
    it('dovrebbe chiamare searchByPosition con i parametri validi', () => {
      const c = createComponent({
        lat: '10',
        lng: '20',
        radius: '7'
      });

      expect(vm.searchByPosition).toHaveBeenCalledWith(10, 20, 7);
      expect(c.title).toBe('Ristoranti vicino alla posizione selezionata');
    });

    it('dovrebbe usare un raggio di default di 5km se non specificato', () => {
      createComponent({
        lat: '10',
        lng: '20'
      });

      expect(vm.searchByPosition).toHaveBeenCalledWith(10, 20, 5);
    });

    it('non dovrebbe chiamare il viewmodel se i parametri non sono validi', () => {
      const c = createComponent({
        lat: 'abc',
        lng: '20'
      });

      expect(vm.searchByPosition).not.toHaveBeenCalled();
      expect(c.title).toBe('Parametri non validi');
    });
  });

  // ----------------------------------------------------------------
  describe('Casi limite', () => {
    it('dovrebbe mostrare un titolo specifico se non viene fornito alcun criterio di ricerca', () => {
      const c = createComponent({});

      expect(vm.searchByName).not.toHaveBeenCalled();
      expect(vm.searchByPosition).not.toHaveBeenCalled();

      expect(c.title).toBe('Nessun criterio di ricerca');
    });
  });

});
