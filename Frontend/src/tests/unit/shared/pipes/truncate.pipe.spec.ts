import { describe, it, expect, beforeEach } from 'vitest';
import { TruncatePipe } from '@shared/pipes/truncate.pipe';

describe('TruncatePipe', () => {
  let pipe: TruncatePipe;

  beforeEach(() => {
    pipe = new TruncatePipe();
  });

  describe('transform()', () => {
    it('dovrebbe restituire stringa vuota se il valore è null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('dovrebbe restituire stringa vuota se il valore è undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('dovrebbe restituire la stringa originale se la lunghezza è minore del limite', () => {
      const value = 'Testo breve';
      expect(pipe.transform(value, 50)).toBe(value);
    });

    it('dovrebbe restituire la stringa originale se la lunghezza è uguale al limite', () => {
      const value = '12345';
      expect(pipe.transform(value, 5)).toBe(value);
    });

    it('dovrebbe troncare la stringa se supera la lunghezza massima', () => {
      const value = 'Questo è un testo molto lungo';
      expect(pipe.transform(value, 10)).toBe('Questo è u…');
    });

    it('dovrebbe rimuovere gli spazi finali prima di aggiungere il suffisso', () => {
      const value = 'Testo con spazio finale ';
      // slice(0, 10): "Testo con "
      expect(pipe.transform(value, 10)).toBe('Testo con…');
    });

    it('dovrebbe usare il suffisso di default se non specificato', () => {
      const value = 'abcdefghij';
      expect(pipe.transform(value, 5)).toBe('abcde…');
    });

    it('dovrebbe usare un suffisso personalizzato se fornito', () => {
      const value = 'abcdefghij';
      expect(pipe.transform(value, 5, '...')).toBe('abcde...');
    });

    it('dovrebbe funzionare con maxLength pari a zero', () => {
      const value = 'testo';
      expect(pipe.transform(value, 0)).toBe('…');
    });
  });
});
