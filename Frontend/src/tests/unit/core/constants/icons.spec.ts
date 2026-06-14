import { describe, it, expect } from 'vitest';
import { ICON_PATHS, getUserIconPath } from '@core/constants/icons';

/**
 * @file Questo file contiene i test di unità per le costanti e le funzioni helper
 * definite in 'src/app/core/constants/icons.ts'.
 *
 * OBIETTIVO:
 * Verificare che:
 * 1. L'array di costanti `ICON_PATHS` sia corretto, completo e non venga modificato accidentalmente.
 * 2. La funzione `getUserIconPath` gestisca correttamente tutti i possibili input (validi,
 *    non validi e casi limite), restituendo sempre un percorso di fallback valido per
 *    garantire la robustezza dell'interfaccia utente.
 */
describe('Test di unità per le costanti e le funzioni delle icone', () => {
  // Suite di test per la costante ICON_PATHS
  describe('Costante: ICON_PATHS', () => {
    it('deve contenere esattamente 15 percorsi di icone', () => {
      expect(ICON_PATHS.length).toBe(15);
    });

    it('deve generare correttamente tutti i percorsi delle icone', () => {
      for (let i = 0; i < 15; i++) {
        expect(ICON_PATHS[i]).toBe(`assets/icons/users/icon-${i + 1}.png`);
      }
    });

    // Test di sanità per verificare i valori ai limiti dell'array.
    it('deve avere il percorso corretto per la prima e l’ultima icona', () => {
      expect(ICON_PATHS[0]).toBe('assets/icons/users/icon-1.png');
      expect(ICON_PATHS[14]).toBe('assets/icons/users/icon-15.png');
    });

  });

  // Suite di test per la funzione helper getUserIconPath
  describe('Funzione: getUserIconPath', () => {
    it('deve restituire il percorso corretto quando l’ID è valido (es: 5)', () => {
      expect(getUserIconPath(5)).toBe('assets/icons/users/icon-5.png');
    });

    it('deve restituire la prima icona quando ID = 1', () => {
      expect(getUserIconPath(1)).toBe('assets/icons/users/icon-1.png');
    });

    it('deve restituire l’ultima icona quando ID = 15', () => {
      expect(getUserIconPath(15)).toBe('assets/icons/users/icon-15.png');
    });

    // Test per un ID numerico valido ma fuori dall'indice standard (0).
    it('deve restituire la prima icona quando ID = 0', () => {
      expect(getUserIconPath(0)).toBe('assets/icons/users/icon-1.png');
    });

    it('deve restituire la prima icona quando ID è negativo', () => {
      expect(getUserIconPath(-3)).toBe('assets/icons/users/icon-1.png');
    });

    it('deve restituire la prima icona quando ID supera il range', () => {
      expect(getUserIconPath(999)).toBe('assets/icons/users/icon-1.png');
    });

    it('deve restituire la prima icona quando ID è NaN', () => {
      expect(getUserIconPath(NaN as any)).toBe('assets/icons/users/icon-1.png');
    });

    it('deve restituire la prima icona quando ID è undefined', () => {
      expect(getUserIconPath(undefined as any)).toBe('assets/icons/users/icon-1.png');
    });

    it('deve restituire la prima icona quando ID è null', () => {
      expect(getUserIconPath(null as any)).toBe('assets/icons/users/icon-1.png');
    });

  });

});
