import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Input: () => () => {},
    ViewChild: () => () => {},
    inject: () => ({
      latitude: 45,
      longitude: 9,
      restaurantName: 'Ristorante Test',
      setCoords: vi.fn(),
    }),
  };
});

const observeMock = vi.fn();
const disconnectMock = vi.fn();

(globalThis as any).ResizeObserver = vi.fn(() => ({
  observe: observeMock,
  disconnect: disconnectMock,
}));

// Mock mappa
const mapInvalidateMock = vi.fn();
const mapRemoveMock = vi.fn();

const mapMock = {
  setView: vi.fn().mockReturnThis(),
  invalidateSize: mapInvalidateMock,
  remove: mapRemoveMock,
};

const tileLayerOnMock = vi.fn();
const tileLayerAddToMock = vi.fn().mockReturnThis();

const markerBindTooltipMock = vi.fn();
const markerAddToMock = vi.fn().mockReturnThis();

vi.mock('leaflet', () => ({
  map: vi.fn(() => mapMock),
  tileLayer: vi.fn(() => ({
    addTo: tileLayerAddToMock,
    on: tileLayerOnMock,
  })),
  marker: vi.fn(() => ({
    addTo: markerAddToMock,
    bindTooltip: markerBindTooltipMock,
  })),
  icon: vi.fn(),
}));

import { MiniMapComponent } from '@shared/components/mini-map/views/mini-map.component';

describe('MiniMapComponent', () => {
  let component: MiniMapComponent;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();

    component = new MiniMapComponent();

    container = document.createElement('div');
    container.getBoundingClientRect = () => ({
        width: 200,
        height: 180,
        top: 0,
        left: 0,
        right: 200,
        bottom: 180,
        x: 0,
        y: 0,
        toJSON: () => {},
    });

    (component as any).mapContainer = {
        nativeElement: container,
    };
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('Ciclo di vita', () => {
    // ----------------------------------------------------------------
    describe('ngAfterViewInit', () => {
      it('dovrebbe terminare e loggare un errore se le coordinate non sono valide', () => {
        component.latitude = NaN as any;
        component.longitude = 10;
        component.name = 'Test';

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const setCoordsSpy = vi.spyOn((component as any).vm, 'setCoords');

        component.ngAfterViewInit();

        expect(errorSpy).toHaveBeenCalled();
        expect(setCoordsSpy).not.toHaveBeenCalled();
        expect(observeMock).not.toHaveBeenCalled();
      });

      it('dovrebbe inizializzare il ResizeObserver con coordinate valide', () => {
        component.latitude = 45;
        component.longitude = 9;
        component.name = 'Ristorante';

        component.ngAfterViewInit();

        expect(observeMock).toHaveBeenCalledWith(container);
      });
    });

    // ----------------------------------------------------------------
    describe('ngOnDestroy', () => {
      it('dovrebbe disconnettere il ResizeObserver e rimuovere la mappa', () => {
        component.latitude = 45;
        component.longitude = 9;
        component.name = 'Ristorante';

        component.ngAfterViewInit();

        (component as any).map = mapMock;

        component.ngOnDestroy();

        expect(disconnectMock).toHaveBeenCalled();
        expect(mapRemoveMock).toHaveBeenCalled();
      });
    });
  });

  // ----------------------------------------------------------------
  describe('Interazione con la mappa', () => {
    // ----------------------------------------------------------------
    describe('Callback di ResizeObserver', () => {
      it('dovrebbe inizializzare la mappa se non esiste e le dimensioni sono valide', () => {
        vi.useFakeTimers();

        component.latitude = 45;
        component.longitude = 9;
        component.name = 'Ristorante';

        component.ngAfterViewInit();

        const resizeCallback = (ResizeObserver as any).mock.calls[0][0];
        resizeCallback();

        vi.advanceTimersByTime(120);

        expect(mapMock.setView).toHaveBeenCalled();
      });

      it('dovrebbe chiamare invalidateSize se la mappa esiste già', () => {
        vi.useFakeTimers();

        component.latitude = 45;
        component.longitude = 9;
        component.name = 'Ristorante';

        component.ngAfterViewInit();

        (component as any).map = mapMock;

        const resizeCallback = (ResizeObserver as any).mock.calls[0][0];
        resizeCallback();

        vi.advanceTimersByTime(120);

        expect(mapInvalidateMock).toHaveBeenCalledWith(true);
      });

      it('dovrebbe terminare se il container non ha dimensioni valide', () => {
        vi.useFakeTimers();

        component.latitude = 45;
        component.longitude = 9;
        component.name = 'Ristorante';

        container.getBoundingClientRect = () => ({
            width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => {},
        });

        const initMapSpy = vi.spyOn<any, any>(component as any, 'initMap');

        component.ngAfterViewInit();

        const resizeCallback = (ResizeObserver as any).mock.calls[0][0];

        resizeCallback();
        vi.advanceTimersByTime(120);

        expect(initMapSpy).not.toHaveBeenCalled();
        expect(mapInvalidateMock).not.toHaveBeenCalled();
      });
    });

    // ----------------------------------------------------------------
    describe('initMap', () => {
      it('dovrebbe creare mappa, tile layer e marker con tooltip', () => {
        component.latitude = 45;
        component.longitude = 9;
        component.name = 'Ristorante';

        component.ngAfterViewInit();

        vi.useFakeTimers();

        const resizeCallback = (ResizeObserver as any).mock.calls[0][0];
        resizeCallback();
        vi.advanceTimersByTime(120);

        expect(tileLayerAddToMock).toHaveBeenCalled();
        expect(markerAddToMock).toHaveBeenCalled();
        expect(markerBindTooltipMock).toHaveBeenCalledWith(
          'Ristorante Test',
          expect.objectContaining({
            className: 'restaurant-tooltip',
          })
        );
      });

      it('dovrebbe aggiungere la classe "map-loaded" al caricamento del tile layer', () => {
        component.latitude = 45;
        component.longitude = 9;
        component.name = 'Ristorante';

        const host = document.createElement('app-mini-map');
        host.appendChild(container);
        document.body.appendChild(host);

        container.closest = vi.fn().mockImplementation((selector: string) => {
            if (selector === 'app-mini-map') return host;
            return null;
        });

        component.ngAfterViewInit();

        vi.useFakeTimers();

        const resizeCallback = (ResizeObserver as any).mock.calls[0][0];
        resizeCallback();
        vi.advanceTimersByTime(120);

        const loadCallback = tileLayerOnMock.mock.calls.find(
            (c: any[]) => c[0] === 'load'
        )?.[1];

        expect(loadCallback).toBeDefined();

        loadCallback();

        expect(host.classList.contains('map-loaded')).toBe(true);

        document.body.removeChild(host);
      });
    });
  });
});
