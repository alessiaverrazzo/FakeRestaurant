import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');

  return {
    ...actual,
    Injectable: () => (cls: any) => cls,
  };
});

import { MiniMapViewModel } from '@shared/components/mini-map/viewmodels/mini-map.viewmodel';

describe('MiniMapViewModel', () => {
  let viewModel: MiniMapViewModel;

  beforeEach(() => {
    viewModel = new MiniMapViewModel();
  });

  // ----------------------------------------------------------------
  describe('Stato iniziale', () => {
    it('dovrebbe avere il nome del ristorante inizializzato come stringa vuota', () => {
      expect(viewModel.restaurantName).toBe('');
    });
  });

  // ----------------------------------------------------------------
  describe('setCoords', () => {
    it('dovrebbe convertire e impostare correttamente latitudine e longitudine', () => {
      viewModel.setCoords('45.5', '9.2');

      expect(viewModel.latitude).toBe(45.5);
      expect(viewModel.longitude).toBe(9.2);
    });

    it('dovrebbe gestire coordinate non numeriche e loggare un avviso', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      viewModel.setCoords('abc', 'def');

      expect(viewModel.latitude).toBeNaN();
      expect(viewModel.longitude).toBeNaN();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('dovrebbe sanitizzare il nome del ristorante rimuovendo i tag HTML', () => {
      viewModel.setCoords(45, 9, '<b>Ristorante</b>');

      expect(viewModel.restaurantName).toBe('bRistorante/b');
    });

    it('dovrebbe normalizzare gli spazi multipli nel nome del ristorante', () => {
      viewModel.setCoords(45, 9, '  Ristorante   Italiano   ');

      expect(viewModel.restaurantName).toBe('Ristorante Italiano');
    });

    it('dovrebbe rimuovere gli spazi iniziali e finali dal nome', () => {
      viewModel.setCoords(45, 9, '   Trattoria Roma   ');

      expect(viewModel.restaurantName).toBe('Trattoria Roma');
    });

    it('non dovrebbe modificare il nome del ristorante se non viene fornito', () => {
      viewModel.restaurantName = 'Nome Esistente';

      viewModel.setCoords(45, 9);

      expect(viewModel.restaurantName).toBe('Nome Esistente');
    });

    it('dovrebbe applicare tutte le regole di sanitizzazione insieme', () => {
      viewModel.setCoords(45, 9, '   <script>  Ristorante   Test </script>   ');

      expect(viewModel.restaurantName).toBe('script Ristorante Test /script');
    });
  });
});
