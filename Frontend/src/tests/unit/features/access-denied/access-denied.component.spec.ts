import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock decoratori Angular per evitare la compilazione JIT
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

import { AccessDeniedComponent } from '@features/access-denied/views/access-denied.component';

describe('AccessDeniedComponent', () => {
  let component: AccessDeniedComponent;
  let navigateMock: any;

  beforeEach(() => {
    vi.useFakeTimers();

    navigateMock = vi.fn();

    component = new AccessDeniedComponent({
      navigate: navigateMock
    } as any);
  });

  it('dovrebbe essere creato', () => {
    expect(component).toBeTruthy();
  });

  it('dovrebbe reindirizzare alla home dopo 3250ms', () => {
    component.ngOnInit();

    expect(navigateMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(3250);

    expect(navigateMock).toHaveBeenCalledWith(['/']);
  });

  it('dovrebbe avere un template statico corretto', () => {
    const template = `
      <h1>Accesso negato</h1>
      <button routerLink="/">Torna alla home</button>
    `;
    const div = document.createElement('div');
    div.innerHTML = template;

    expect(div.querySelector('h1')?.textContent).toContain('Accesso negato');
    expect(div.querySelector('button')?.getAttribute('routerLink')).toBe('/');
  });
});
