import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject } from 'rxjs';
import { NavigationEnd, Router } from '@angular/router';
import { AppComponent } from '../../app/app';

describe('AppComponent', () => {
  let component: AppComponent;
  let routerEvents$: Subject<any>;
  let routerMock: any;

  beforeEach(() => {
    routerEvents$ = new Subject();

    routerMock = {
      events: routerEvents$.asObservable(),
      currentNavigation: vi.fn(),
    };

    component = new AppComponent(routerMock as Router);
  });

  it('dovrebbe inizializzare tutti i modali come chiuse', () => {
    expect(component.showLogin).toBe(false);
    expect(component.showRegister).toBe(false);
    expect(component.showPasswordResetRequest).toBe(false);
  });

  describe('Gestione Modali', () => {
    describe('Apertura', () => {
      it('openLogin dovrebbe aprire solo il modale di login', () => {
        component.openLogin();

        expect(component.showLogin).toBe(true);
        expect(component.showRegister).toBe(false);
        expect(component.showPasswordResetRequest).toBe(false);
      });

      it('openRegister dovrebbe aprire solo il modale di registrazione', () => {
        component.openRegister();

        expect(component.showLogin).toBe(false);
        expect(component.showRegister).toBe(true);
        expect(component.showPasswordResetRequest).toBe(false);
      });

      it('openPasswordResetRequest dovrebbe aprire solo il modale di reset password', () => {
        component.openPasswordResetRequest();

        expect(component.showLogin).toBe(false);
        expect(component.showRegister).toBe(false);
        expect(component.showPasswordResetRequest).toBe(true);
      });
    });

    describe('Chiusura', () => {
      it('closeLogin dovrebbe chiudere il modale di login', () => {
        component.openLogin();
        component.closeLogin();

        expect(component.showLogin).toBe(false);
      });

      it('closeRegister dovrebbe chiudere il modale di registrazione', () => {
        component.openRegister();
        component.closeRegister();

        expect(component.showRegister).toBe(false);
      });

      it('closePasswordResetRequest dovrebbe chiudere il modale di reset password', () => {
        component.openPasswordResetRequest();
        component.closePasswordResetRequest();

        expect(component.showPasswordResetRequest).toBe(false);
      });
    });
  });

  describe('Gestione Eventi Router', () => {
    it('dovrebbe aprire il modale di login quando la navigazione contiene openLogin=true', () => {
      const spy = vi.spyOn(component, 'openLogin');

      (routerMock.currentNavigation as any).mockReturnValue({
        extras: { state: { openLogin: true } },
      });

      routerEvents$.next(new NavigationEnd(1, '/', '/'));

      expect(spy).toHaveBeenCalled();
      expect(component.showLogin).toBe(true);
    });

    it('non dovrebbe aprire il login se openLogin non è presente nello state', () => {
      const spy = vi.spyOn(component, 'openLogin');

      (routerMock.currentNavigation as any).mockReturnValue({
        extras: { state: {} },
      });

      routerEvents$.next(new NavigationEnd(1, '/', '/'));

      expect(spy).not.toHaveBeenCalled();
      expect(component.showLogin).toBe(false);
    });
  });
});
