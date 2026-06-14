import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Component: () => (cls: any) => cls,
    Injectable: () => (cls: any) => cls,
    Directive: () => (cls: any) => cls,
    Pipe: () => (cls: any) => cls,
    Input: () => () => {},
    ViewChild: () => () => {},
  };
});

import { HorizontalScrollerComponent } from '@shared/components/horizontal-scroller/horizontal-scroller.component';

describe('HorizontalScrollerComponent', () => {
  let component: HorizontalScrollerComponent;
  let scrollByMock: any;

  beforeEach(() => {
    scrollByMock = vi.fn();

    component = new HorizontalScrollerComponent();

    // mock manuale del ViewChild
    (component as any).scroller = {
      nativeElement: {
        scrollBy: scrollByMock,
      },
    };
  });

  // ----------------------------------------------------------------
  describe('Creazione e Inizializzazione', () => {
    it('dovrebbe creare il componente', () => {
      expect(component).toBeTruthy();
    });

    it('dovrebbe avere valori di default corretti', () => {
      expect(component.scrollAmount).toBe(350);
      expect(component.minItemWidth).toBe('320px');
      expect(component.maxItemWidth).toBe('440px');
    });
  });

  // ----------------------------------------------------------------
  describe('Metodi di scroll', () => {
    it('scrollLeft: dovrebbe scrollare a sinistra della quantità di default', () => {
      component.scrollLeft();

      expect(scrollByMock).toHaveBeenCalledWith({
        left: -350,
        behavior: 'smooth',
      });
    });

    it('scrollRight: dovrebbe scrollare a destra della quantità di default', () => {
      component.scrollRight();

      expect(scrollByMock).toHaveBeenCalledWith({
        left: 350,
        behavior: 'smooth',
      });
    });

    it('dovrebbe rispettare un valore di scrollAmount personalizzato', () => {
      component.scrollAmount = 500;

      component.scrollRight();

      expect(scrollByMock).toHaveBeenCalledWith({
        left: 500,
        behavior: 'smooth',
      });
    });
  });
});
