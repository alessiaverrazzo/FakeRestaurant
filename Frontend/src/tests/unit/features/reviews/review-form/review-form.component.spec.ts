import { describe, it, beforeEach, expect, vi } from 'vitest';
import '@angular/compiler';

vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<any>('@angular/core');
  return {
    ...actual,
    Component: () => (cls: any) => cls,
  };
});

import { ReviewFormComponent } from
  '@features/reviews/review-tree/views/review-form/review-form.component';

describe('ReviewFormComponent', () => {
  let comp: ReviewFormComponent;

  beforeEach(() => {
    comp = new ReviewFormComponent();
    comp.isLoggedIn = false;
    comp.parentReviewId = null;
  });

  // ----------------------------------------------------------------
  describe('Proprietà calcolate', () => {
    it('length: dovrebbe ritornare la lunghezza del contenuto', () => {
      comp.content.set('ciao');
      expect(comp.length).toBe(4);
    });

    it('overLimit: dovrebbe essere true solo se si supera la lunghezza massima', () => {
      comp.content.set('a'.repeat(500));
      expect(comp.overLimit).toBe(false);

      comp.content.set('a'.repeat(501));
      expect(comp.overLimit).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('counterColor', () => {
    it('dovrebbe essere rosso se si supera il limite', () => {
      comp.content.set('a'.repeat(501));
      expect(comp.counterColor).toBe('text-red-accent');
    });

    it('dovrebbe essere rosso quando vicino al limite', () => {
      comp.content.set('a'.repeat(461)); // 500 - 39
      expect(comp.counterColor).toBe('text-red-accent');
    });

    it('dovrebbe essere arancione quando si avvicina al limite', () => {
      comp.content.set('a'.repeat(401)); // 500 - 99
      expect(comp.counterColor).toBe('text-orange-soft');
    });

    it('dovrebbe essere marrone quando lontano dal limite', () => {
      comp.content.set('a'.repeat(100));
      expect(comp.counterColor).toBe('text-brown-dark');
    });
  });

  // ----------------------------------------------------------------
  describe('onInput', () => {
    it('dovrebbe normalizzare gli spazi bianchi', () => {
      comp.onInput('ciao   mondo');
      expect(comp.content()).toBe('ciao mondo');
    });

    it('non dovrebbe aggiornare il contenuto se supera la lunghezza massima', () => {
      comp.content.set('ok');

      comp.onInput('a'.repeat(600));

      expect(comp.content()).toBe('ok');
    });
  });

  // ----------------------------------------------------------------
  describe('onSubmit', () => {
    it("non dovrebbe emettere l'evento se l'utente non è loggato", () => {
      const spy = vi.spyOn(comp.submitForm, 'emit');

      comp.content.set('test');
      comp.onSubmit();

      expect(spy).not.toHaveBeenCalled();
    });

    it("non dovrebbe emettere l'evento se il contenuto ha solo spazi", () => {
      const spy = vi.spyOn(comp.submitForm, 'emit');

      comp.isLoggedIn = true;
      comp.content.set('     \n   ');

      comp.onSubmit();

      expect(spy).not.toHaveBeenCalled();
    });

    it("non dovrebbe emettere l'evento se si supera il limite di caratteri", () => {
      const spy = vi.spyOn(comp.submitForm, 'emit');

      comp.isLoggedIn = true;
      comp.content.set('a'.repeat(501));

      comp.onSubmit();

      expect(spy).not.toHaveBeenCalled();
    });

    it("dovrebbe emettere l'evento submitForm e resettare il contenuto se valido", () => {
      const spy = vi.spyOn(comp.submitForm, 'emit');

      comp.isLoggedIn = true;
      comp.parentReviewId = 10;
      comp.content.set('  testo valido  ');

      comp.onSubmit();

      expect(spy).toHaveBeenCalledWith({
        content: 'testo valido',
        parentReviewId: 10,
      });
      expect(comp.content()).toBe('');
    });
  });
});
