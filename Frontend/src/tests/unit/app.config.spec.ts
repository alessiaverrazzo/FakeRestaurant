import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { appConfig } from '../../app/app.config';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from '@core/interceptors/auth.interceptor';
import { ErrorInterceptor } from '@core/interceptors/error.interceptor';
import type { Provider } from '@angular/core';

describe('appConfig', () => {

  it('dovrebbe definire una lista di provider', () => {
    expect(appConfig.providers).toBeDefined();
    expect(appConfig.providers!.length).toBeGreaterThan(0);
  });

  it('dovrebbe registrare AuthInterceptor tra gli HTTP_INTERCEPTORS', () => {
    const providers = appConfig.providers as Provider[];

    const authInterceptorProvider = providers.find(
      (p): p is Provider & { useClass: any } =>
        typeof p === 'object' &&
        'provide' in p &&
        p.provide === HTTP_INTERCEPTORS &&
        'useClass' in p &&
        p.useClass === AuthInterceptor
    );

    expect(authInterceptorProvider).toBeDefined();
  });

  it('dovrebbe registrare ErrorInterceptor tra gli HTTP_INTERCEPTORS', () => {
    const providers = appConfig.providers as Provider[];

    const errorInterceptorProvider = providers.find(
      (p): p is Provider & { useClass: any } =>
        typeof p === 'object' &&
        'provide' in p &&
        p.provide === HTTP_INTERCEPTORS &&
        'useClass' in p &&
        p.useClass === ErrorInterceptor
    );

    expect(errorInterceptorProvider).toBeDefined();
  });
});
