import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { SearchResultsViewModel } from '../viewmodels/search-results.viewmodel';
import { RestaurantCardComponent } from '@shared/components/restaurant-card/views/restaurant-card.component';

/**
 * Componente per la pagina dei risultati di ricerca.
 * Legge i parametri dalla query string (nome o posizione) e delega la ricerca al ViewModel.
 * Visualizza i risultati sotto forma di lista di card.
 */
@Component({
  selector: 'app-search-results-page',
  standalone: true,
  imports: [
    CommonModule,
    RestaurantCardComponent
  ],
  templateUrl: './search-results-page.component.html',
})
export class SearchResultsPageComponent implements OnInit {

  /** Titolo della pagina, dinamico in base al tipo di ricerca. */
  title: string = '';

  constructor(
    public vm: SearchResultsViewModel,
    private route: ActivatedRoute
  ) {}

  /**
   * Inizializza il componente.
   * Sottoscrive ai cambiamenti dei query params per rilevare il tipo di ricerca (testuale o geografica)
   * e avviare l'operazione corrispondente tramite il ViewModel.
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {

      // Gestione ricerca per nome (parametro 'query')
      if (params['query']) {
        const raw = params['query'];
        // Sanitizzazione input
        const q = String(raw).trim();

        this.title = q.length > 0
          ? `Risultati per "${q}"`
          : 'Risultati della ricerca';

        this.vm.searchByName(q);
        return;
      }

      // Gestione ricerca per posizione (parametri 'lat', 'lng', 'radius')
      if (params['lat'] && params['lng']) {
        const lat = Number(params['lat']);
        const lng = Number(params['lng']);
        const radius = Number(params['radius'] ?? 5);

        // Validazione dei parametri numerici
        if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
          this.title = 'Parametri non validi';
          return;
        }

        this.title = `Ristoranti vicino alla posizione selezionata`;
        this.vm.searchByPosition(lat, lng, radius);
        return;
      }

      // Fallback: nessun criterio valido trovato
      this.title = 'Nessun criterio di ricerca';
    });
  }
}
