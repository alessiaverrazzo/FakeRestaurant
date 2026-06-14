import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
    signal: (initialValue: any) => {
      let value = initialValue;

      const fn = (() => value) as any;
      fn.set = (v: any) => {
        value = v;
      };

      return fn;
    },
  };
});

import { MapLocationPickerViewModel } from '@shared/components/map-location-picker/viewmodels/map-location-picker.viewmodel';

describe('MapLocationPickerViewModel', () => {
  let viewModel: MapLocationPickerViewModel;

  beforeEach(() => {
    viewModel = new MapLocationPickerViewModel();
  });

  // ----------------------------------------------------------------
  describe('Stato iniziale', () => {
    it('dovrebbe avere la location iniziale impostata a null', () => {
      expect(viewModel.location()).toBeNull();
    });

    it('dovrebbe avere il raggio iniziale impostato a 5', () => {
      expect(viewModel.radiusKm()).toBe(5);
    });
  });

  // ----------------------------------------------------------------
  describe('setLocation', () => {
    it('dovrebbe aggiornare la location con le coordinate fornite', () => {
      viewModel.setLocation(41.9, 12.5);

      expect(viewModel.location()).toEqual({
        lat: 41.9,
        lng: 12.5,
      });
    });

    it('dovrebbe sovrascrivere la location precedente se chiamato più volte', () => {
      viewModel.setLocation(10, 20);
      viewModel.setLocation(30, 40);

      expect(viewModel.location()).toEqual({
        lat: 30,
        lng: 40,
      });
    });
  });

  // ----------------------------------------------------------------
  describe('setRadius', () => {
    it('dovrebbe aggiornare il raggio con il valore fornito', () => {
      viewModel.setRadius(15);

      expect(viewModel.radiusKm()).toBe(15);
    });

    it('dovrebbe sovrascrivere il raggio precedente se chiamato più volte', () => {
      viewModel.setRadius(10);
      viewModel.setRadius(25);

      expect(viewModel.radiusKm()).toBe(25);
    });
  });
});
