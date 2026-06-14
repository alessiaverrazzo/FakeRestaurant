import { Injectable, signal, inject } from '@angular/core';
import { SearchResult } from '../models/search-results.model';
import { RestaurantService } from '@core/services/restaurant.service';

/**
 * ViewModel per la pagina dei risultati di ricerca.
 * Gestisce lo stato della ricerca (risultati, caricamento, errori) e comunica con il RestaurantService.
 */
@Injectable({ providedIn: 'root' })
export class SearchResultsViewModel {

  private restaurantService = inject(RestaurantService);

  /** Signal che contiene la lista dei risultati di ricerca. */
  results = signal<SearchResult[]>([]);
  /** Signal per lo stato di caricamento. */
  loading = signal(false);
  /** Signal per eventuali messaggi di errore. */
  error = signal<string | null>(null);

  constructor() {}

  /**
   * Estrae un messaggio di errore leggibile dall'oggetto errore.
   */
  private extractError(err: any): string {
    return (
      err?.error?.message ||
      err?.message ||
      'Si è verificato un errore. Riprova più tardi.'
    );
  }

  /**
   * Esegue una ricerca di ristoranti per nome.
   * @param query La stringa di ricerca.
   */
  searchByName(query: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.restaurantService.searchByName(query).subscribe({
      next: list => {
        this.results.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(this.extractError(err));
        this.loading.set(false);
      },
    });
  }

  /**
   * Esegue una ricerca di ristoranti per posizione geografica.
   * @param lat Latitudine centrale.
   * @param lng Longitudine centrale.
   * @param radiusKm Raggio di ricerca in km.
   */
  searchByPosition(lat: number, lng: number, radiusKm: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.restaurantService.searchByPosition(lat, lng, radiusKm).subscribe({
      next: list => {
        this.results.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(this.extractError(err));
        this.loading.set(false);
      },
    });
  }
}
