import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';

import {
  provideRouter,
  withInMemoryScrolling
} from '@angular/router';

import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';

import { routes } from './app.routes';

import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';

/**
 * Configurazione principale dell'applicazione Angular.
 * Definisce i provider globali, inclusi il routing, il client HTTP,
 * gli interceptor e la gestione del rilevamento dei cambiamenti.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // Abilita i listener globali per gli errori del browser
    provideBrowserGlobalErrorListeners(),

    // Configura la Change Detection di Angular con ottimizzazioni (event coalescing)
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Configura il Router con le rotte dell'app e il ripristino della posizione di scroll
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })
    ),

    // Configura HttpClient per supportare gli interceptor basati su Dependency Injection
    provideHttpClient(withInterceptorsFromDi()),

    // Registra l'AuthInterceptor per gestire i token JWT
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    // Registra l'ErrorInterceptor per la gestione centralizzata degli errori HTTP
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    },
  ],
};
