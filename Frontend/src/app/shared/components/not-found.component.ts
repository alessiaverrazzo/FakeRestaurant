import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Componente per la pagina 404 (Not Found).
 * Viene visualizzato quando l'utente naviga verso una rotta inesistente.
 * Offre un messaggio amichevole e un link per tornare alla home page.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-white-background">

      <!-- Icona / Emoji ironica -->
      <div class="text-6xl mb-4">🧐</div>

      <!-- Titolo -->
      <h1 class="text-4xl font-extrabold text-brown-dark mb-2">
        404 - Pagina non trovata
      </h1>

      <!-- Sottotitolo -->
      <p class="text-brown-dark/70 text-lg max-w-xl mb-8">
        Sembra che tu abbia ordinato un piatto che non è nel menù.<br />
        Prova a tornare alla home!
      </p>

      <!-- Bottone -->
      <a
        routerLink="/"
        class="bg-brown-dark text-yellow-primary px-6 py-3 rounded-full text-lg font-semibold hover:bg-orange-soft transition shadow"
      >
        Torna alla Home
      </a>

    </div>
  `,
})
export class NotFoundComponent {}
