import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Injectable: () => (cls: any) => cls,
    Input: () => () => {},
    Output: () => () => {},
    ViewChild: () => () => {},
    EventEmitter: class {
      emit = vi.fn();
    },
  };
});

// Mock mappa
const mapMock = {
  setView: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  on: vi.fn(),
};
mapMock.setView.mockReturnValue(mapMock);

const markerOnMock = vi.fn();
const markerAddToMock = vi.fn().mockReturnThis();
const markerBindTooltipMock = vi.fn().mockReturnThis();
const markerRemoveMock = vi.fn();
const markerGetLatLngMock = vi.fn().mockReturnValue({ lat: 10, lng: 20 });

const circleMock = {
  addTo: vi.fn(),
  remove: vi.fn(),
};
circleMock.addTo.mockReturnValue(circleMock);

vi.mock('leaflet', () => ({
  map: vi.fn(() => mapMock),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => ({
    addTo: markerAddToMock,
    bindTooltip: markerBindTooltipMock,
    on: markerOnMock,
    remove: markerRemoveMock,
    getLatLng: markerGetLatLngMock,
  })),
  circle: vi.fn(() => circleMock),
  icon: vi.fn(),
}));

import { MapLocationPickerComponent } from '@shared/components/map-location-picker/views/map-location-picker.component';

describe('MapLocationPickerComponent', () => {
  let component: MapLocationPickerComponent;

  beforeEach(() => {
    component = new MapLocationPickerComponent();

    // mock ViewChild
    (component as any).mapContainer = {
      nativeElement: document.createElement('div'),
    };

    // mock fetch globale
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
    });

  });

  // ----------------------------------------------------------------
  describe('Creazione e Inizializzazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });

    it('dovrebbe avere i valori di default per gli input', () => {
      expect(component.enableRadiusSelection).toBe(false);
      expect(component.showSearchBar).toBe(true);
      expect(component.markerIconUrl).toContain('restaurant-marker');
    });
  });

  // ----------------------------------------------------------------
  describe('Ciclo di vita', () => {
    it('ngAfterViewInit: dovrebbe inizializzare la mappa e impostare il raggio iniziale', () => {
      component.initialRadiusKm = 10;
      component.ngAfterViewInit();
      expect(component.currentRadiusKm).toBe(10);
    });
  });

  // ----------------------------------------------------------------
  describe('Controlli di zoom', () => {
    it('zoomIn: dovrebbe aumentare lo zoom della mappa', () => {
      component.ngAfterViewInit();
      component.zoomIn();
      expect(mapMock.zoomIn).toHaveBeenCalled();
    });

    it('zoomOut: dovrebbe diminuire lo zoom della mappa', () => {
      component.ngAfterViewInit();
      component.zoomOut();
      expect(mapMock.zoomOut).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Selezione della posizione', () => {
    it('setLocation: dovrebbe emettere l\'evento "locationSelected" con coordinate valide', () => {
      component.ngAfterViewInit();
      component['setLocation'](45, 9);
      expect(component.locationSelected.emit).toHaveBeenCalledWith({ lat: 45, lng: 9 });
    });

    it('setLocation: non dovrebbe emettere l\'evento "locationSelected" con coordinate non valide', () => {
      component.ngAfterViewInit();
      component['setLocation']('abc', 200 as any);
      expect(component.locationSelected.emit).not.toHaveBeenCalled();
    });

    it('setLocation: dovrebbe rimuovere il marker precedente prima di aggiungerne uno nuovo', () => {
      component.ngAfterViewInit();
      const removeSpy = vi.fn();
      component.marker = { remove: removeSpy } as any;
      component['setLocation'](45, 9);
      expect(removeSpy).toHaveBeenCalled();
    });

    it('setLocation: dovrebbe aggiornare il cerchio del raggio se abilitato', () => {
      component.ngAfterViewInit();
      component.enableRadiusSelection = true;
      const spy = vi.spyOn(component, 'updateRadius');
      component['setLocation'](45, 9);
      expect(spy).toHaveBeenCalledWith(45, 9, component.currentRadiusKm);
    });

    it('dovrebbe impostare la posizione al click sulla mappa', () => {
      const spy = vi.spyOn<any, any>(component as any, 'setLocation');
      component.ngAfterViewInit();
      const calls = mapMock.on.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const handler = calls[calls.length - 1][1];
      handler({ latlng: { lat: 40, lng: 15 } });
      expect(spy).toHaveBeenCalledWith(40, 15);
    });
  });

  // ----------------------------------------------------------------
  describe('Gestione del raggio', () => {
    it('onRadiusInput: dovrebbe emettere l\'evento "radiusChanged"', () => {
      component.onRadiusInput(15);
      expect(component.radiusChanged.emit).toHaveBeenCalledWith(15);
    });

    it('onRadiusInput: dovrebbe aggiornare il cerchio sulla mappa se è presente un marker', () => {
      component.marker = { getLatLng: () => ({ lat: 10, lng: 20 }) } as any;
      const spy = vi.spyOn(component, 'updateRadius');
      component.onRadiusInput(30);
      expect(spy).toHaveBeenCalledWith(10, 20, 30);
    });

    it('updateRadius: dovrebbe creare un nuovo cerchio sulla mappa', () => {
      component.ngAfterViewInit();
      component.updateRadius(10, 20, 5);
      expect((component as any).circle).toBe(circleMock);
    });

    it('updateRadius: dovrebbe rimuovere il cerchio precedente prima di crearne uno nuovo', () => {
      const removeSpy = vi.fn();
      component.circle = { remove: removeSpy } as any;
      component.ngAfterViewInit();
      component.updateRadius(10, 20, 5);
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('Ricerca indirizzi', () => {
    it('searchAddress: dovrebbe sanitizzare l’input e applicare il debounce', () => {
      vi.useFakeTimers();
      component.searchAddress('@@@ Roma ###');
      vi.advanceTimersByTime(300);
      expect(component.searchTerm).toBe('@@@ Roma ###'.slice(0, 80));
    });

    it('searchAddress: dovrebbe troncare il termine di ricerca se supera gli 80 caratteri', () => {
      const long = 'a'.repeat(100);
      component.searchAddress(long);
      expect(component.searchTerm.length).toBe(80);
    });

    it('searchAddress: dovrebbe svuotare i risultati se il testo è troppo corto', () => {
      vi.useFakeTimers();
      component.searchResults = [{ display_name: 'X', lat: 1, lon: 1 }];
      component.searchAddress('a');
      vi.advanceTimersByTime(300);
      expect(component.searchResults).toEqual([]);
    });

    it('searchAddress: dovrebbe gestire una risposta HTTP non "ok"', async () => {
      vi.useFakeTimers();
      (fetch as any).mockResolvedValue({ ok: false });
      component.searchAddress('roma');
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      expect(component.searchResults).toEqual([]);
    });

    it('searchAddress: dovrebbe gestire una risposta JSON non valida', async () => {
      vi.useFakeTimers();
      (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      component.searchAddress('roma');
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      expect(component.searchResults).toEqual([]);
    });

    it('searchAddress: dovrebbe gestire gli errori di rete', async () => {
      vi.useFakeTimers();
      (fetch as any).mockRejectedValue(new Error('network'));
      component.searchAddress('roma');
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      expect(component.searchResults).toEqual([]);
    });

    it('searchAddress: dovrebbe mappare correttamente i risultati di ricerca validi', async () => {
      vi.useFakeTimers();
      const apiResponse = [{ display_name: 'Roma, Italia', lat: '41.9028', lon: '12.4964' }];
      (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(apiResponse) });
      component.searchAddress('roma');
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      expect(component.searchResults).toEqual([{ display_name: 'Roma, Italia', lat: 41.9028, lon: 12.4964 }]);
    });

    it('selectSearchResult: dovrebbe impostare la posizione e pulire i risultati', () => {
      const spy = vi.spyOn<any, any>(component as any, 'setLocation').mockImplementation(() => {});
      component.searchResults = [{ display_name: 'Roma', lat: 1, lon: 2 } as any];
      component.selectSearchResult({ display_name: 'Roma', lat: 1, lon: 2 });
      expect(component.searchTerm).toBe('Roma');
      expect(component.searchResults).toEqual([]);
      expect(spy).toHaveBeenCalledWith(1, 2);
    });
  });
});
