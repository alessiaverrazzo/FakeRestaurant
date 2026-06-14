import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { HorizontalScrollerComponent } from '@shared/components/horizontal-scroller/horizontal-scroller.component';
import { RestaurantCardComponent } from '@shared/components/restaurant-card/views/restaurant-card.component';
import { ReviewCardComponent } from '@shared/components/review-card/views/review-card.component';
import { MapLocationPickerComponent } from '@shared/components/map-location-picker/views/map-location-picker.component';

import { RestaurantService } from '@core/services/restaurant.service';
import { ReviewService } from '@core/services/review.service';

import { RestaurantCardModel } from '@shared/components/restaurant-card/models/restaurant-card.model';
import { ReviewCard } from '@shared/components/review-card/models/review-card.model';

/**
 * Componente per la Home Page.
 * Visualizza le sezioni principali: recensioni migliori, ristoranti top/flop e ricerca (testuale o geografica).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HorizontalScrollerComponent,
    RestaurantCardComponent,
    ReviewCardComponent,
    MapLocationPickerComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  private router = inject(Router);
  private reviewService = inject(ReviewService);
  private restaurantService = inject(RestaurantService);

  /** Query di ricerca testuale inserita dall'utente. */
  textQuery = '';

  /** Lista delle recensioni più votate della settimana. */
  bestReviews: ReviewCard[] = [];
  /** Lista dei ristoranti con i voti migliori. */
  topRated: RestaurantCardModel[] = [];
  /** Lista dei ristoranti con i voti peggiori. */
  fallingStars: RestaurantCardModel[] = [];

  /** Flag di caricamento globale. */
  loading = true;
  /** Messaggio di errore eventuale. */
  error: string | null = null;

  /** Latitudine selezionata per la ricerca geografica. */
  selectedLat: number | null = null;
  /** Longitudine selezionata per la ricerca geografica. */
  selectedLng: number | null = null;
  /** Raggio di ricerca selezionato (in km). */
  selectedRadius = 5;

  /**
   * Inizializza il componente caricando i dati della home page.
   */
  ngOnInit(): void {
    this.loadHomepage();
  }

  /**
   * Carica i dati necessari per la home page:
   * - Recensioni "Top Week"
   * - Ristoranti "Top Rated"
   * - Ristoranti "Falling Stars" (Flop)
   * Gestisce il loading state e gli errori.
   */
  loadHomepage() {
    this.loading = true;
    this.error = null;

    this.reviewService.getTop().subscribe({
      next: reviews => {
        this.bestReviews = reviews.map(r => ({
          id: r.id,
          restaurantId: r.restaurantId,
          restaurantName: r.restaurantName,
          content: r.content,
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          createdAt: r.createdAt,
          user: r.user ?? null,
          userVote: r.userVote ?? 0
        }));
      },
      error: err => this.error = err.message
    });

    this.restaurantService.getTop().subscribe({
      next: list => this.topRated = list,
      error: err => this.error = err.message
    });

    this.restaurantService.getFlop().subscribe({
      next: list => this.fallingStars = list,
      error: err => this.error = err.message,
      complete: () => this.loading = false
    });
  }


  /**
   * Esegue la ricerca di ristoranti per nome.
   * Reindirizza alla pagina di ricerca con il parametro 'query'.
   */
  searchByName() {
    const q = this.textQuery.trim();
    if (!q) return;

    this.router.navigate(['/search'], { queryParams: { query: q } });
  }


  /**
   * Gestisce l'evento di selezione della posizione sulla mappa.
   * @param ev Oggetto contenente latitudine e longitudine.
   */
  onLocationSelected(ev: { lat: number; lng: number }) {
    this.selectedLat = ev.lat;
    this.selectedLng = ev.lng;
  }

  /**
   * Gestisce il cambiamento del raggio di ricerca.
   * @param km Il nuovo raggio in chilometri.
   */
  onRadiusChanged(km: number) {
    this.selectedRadius = km;
  }

  /**
   * Esegue la ricerca di ristoranti per posizione geografica.
   * Reindirizza alla pagina di ricerca con i parametri lat, lng e radius.
   */
  searchByPosition() {
    if (this.selectedLat == null || this.selectedLng == null) return;

    this.router.navigate(['/search'], {
      queryParams: {
        lat: this.selectedLat,
        lng: this.selectedLng,
        radius: this.selectedRadius
      }
    });
  }
}
