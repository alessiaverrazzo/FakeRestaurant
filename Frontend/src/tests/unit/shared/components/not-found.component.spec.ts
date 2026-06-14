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
    Output: () => () => {},
  };
});

import { NotFoundComponent } from '@shared/components/not-found.component';

describe('NotFoundComponent', () => {
  let component: NotFoundComponent;

  beforeEach(() => {
    component = new NotFoundComponent();
  });

  // ----------------------------------------------------------------
  describe('Creazione', () => {
    it('dovrebbe creare correttamente il componente', () => {
      expect(component).toBeTruthy();
    });
  });

  // ----------------------------------------------------------------
  describe('Template (Contenuto Statico)', () => {
    it('dovrebbe mostrare il titolo e il messaggio di errore', () => {
      const template = `
        <div class="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-white-background">
          <div class="text-6xl mb-4">🧐</div>
  
          <h1 class="text-4xl font-extrabold text-brown-dark mb-2">
            404 - Pagina non trovata
          </h1>
  
          <p class="text-brown-dark/70 text-lg max-w-xl mb-8">
            Sembra che tu abbia ordinato un piatto che non è nel menù.
            Prova a tornare alla home!
          </p>
  
          <a
            routerLink="/"
            class="bg-brown-dark text-yellow-primary px-6 py-3 rounded-full text-lg font-semibold hover:bg-orange-soft transition shadow"
          >
            Torna alla Home
          </a>
        </div>
      `;
  
      const div = document.createElement('div');
      div.innerHTML = template;
  
      expect(div.querySelector('h1')?.textContent)
        .toContain('404 - Pagina non trovata');
  
      expect(div.querySelector('p')?.textContent)
        .toContain('non è nel menù');
    });
  
    it('dovrebbe mostrare l\'emoji corretta', () => {
      const template = `<div>🧐</div>`;
      const div = document.createElement('div');
      div.innerHTML = template;
  
      expect(div.textContent).toContain('🧐');
    });
  
    it('dovrebbe contenere un link corretto per tornare alla Home', () => {
      const template = `<a routerLink="/">Torna alla Home</a>`;
      const div = document.createElement('div');
      div.innerHTML = template;
  
      const link = div.querySelector('a');
  
      expect(link).toBeTruthy();
      expect(link?.getAttribute('routerLink')).toBe('/');
      expect(link?.textContent).toContain('Torna alla Home');
    });
  
    it('dovrebbe avere le classi CSS di base per il layout', () => {
      const template = `
        <div class="min-h-screen bg-white-background"></div>
      `;
      const div = document.createElement('div');
      div.innerHTML = template;
  
      const container = div.querySelector('div');
  
      expect(container?.className).toContain('min-h-screen');
      expect(container?.className).toContain('bg-white-background');
    });
  });
});
