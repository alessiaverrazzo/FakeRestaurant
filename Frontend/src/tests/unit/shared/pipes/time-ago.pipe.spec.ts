import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeAgoPipe } from '@shared/pipes/time-ago.pipe';

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    pipe = new TimeAgoPipe();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('transform()', () => {
    it('dovrebbe restituire stringa vuota se il valore è null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('dovrebbe restituire stringa vuota se il valore è undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('dovrebbe restituire "proprio ora" se è passato meno di un minuto', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 30 * 1000); // 30 secondi fa
      expect(pipe.transform(date)).toBe('proprio ora');
    });

    it('dovrebbe restituire i minuti se è passato meno di un’ora', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 10 * 60 * 1000); // 10 minuti fa
      expect(pipe.transform(date)).toBe('10 min fa');
    });

    it('dovrebbe restituire le ore se è passato meno di un giorno', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 ore fa
      expect(pipe.transform(date)).toBe('3 h fa');
    });

    it('dovrebbe restituire i giorni se è passato meno di un mese', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-30T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 giorni fa
      expect(pipe.transform(date)).toBe('5 gg fa');
    });

    it('dovrebbe restituire "1 mese fa" se è passato esattamente un mese', () => {
      vi.useFakeTimers();
      const now = new Date('2025-02-01T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('1 mese fa');
    });

    it('dovrebbe restituire i mesi se è passato più di un mese', () => {
      vi.useFakeTimers();
      const now = new Date('2025-04-01T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // circa 3 mesi
      expect(pipe.transform(date)).toBe('3 mesi fa');
    });

    it('dovrebbe restituire "1 anno fa" se è passato esattamente un anno', () => {
      vi.useFakeTimers();
      const now = new Date('2026-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('1 anno fa');
    });

    it('dovrebbe restituire gli anni se è passato più di un anno', () => {
      vi.useFakeTimers();
      const now = new Date('2027-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(date)).toBe('2 anni fa');
    });

    it('dovrebbe accettare una data passata come stringa', () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-01T12:00:00Z');
      vi.setSystemTime(now);

      const dateString = '2025-01-01T11:00:00Z'; // 1 ora fa
      expect(pipe.transform(dateString)).toBe('1 h fa');
    });
  });
});
