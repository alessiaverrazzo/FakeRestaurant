import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RestaurantDetailViewModel } from '../viewmodels/restaurant-detail.viewmodel';
import { MiniMapComponent } from 'src/app/shared/components/mini-map/views/mini-map.component';
import { FormsModule } from '@angular/forms';
import { ReviewTreeComponent } from '@features/reviews/review-tree/views/review-tree/review-tree.component';

import { RestaurantService } from '@core/services/restaurant.service';
import { AuthService } from '@core/services/auth.service';

/**
 * Componente per la visualizzazione del dettaglio di un ristorante.
 * Mostra le informazioni principali, la mappa e l'albero delle recensioni.
 * Gestisce anche l'evidenziazione di recensioni specifiche tramite query params.
 */
@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, MiniMapComponent, FormsModule, ReviewTreeComponent],
  providers: [RestaurantDetailViewModel],
  templateUrl: './restaurant-detail.component.html',
  styleUrls: ['./restaurant-detail.component.scss'],
})
export class RestaurantDetailComponent implements OnInit {

  constructor(
    public vm: RestaurantDetailViewModel,
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private auth: AuthService
  ) {}

  /**
   * Inizializza il componente.
   * Sottoscrive ai cambiamenti dei parametri della rotta (ID ristorante) e dei query params (highlight recensioni).
   */
  ngOnInit() {
    // Ascolta i query params per gestire l'highlight di recensioni specifiche
    this.route.queryParamMap.subscribe(params => {
      const highlightRootReviewId = params.get('highlightRootReviewId');
      const highlightReviewId = params.get('highlightReviewId');

      this.vm.setHighlightParams({
        highlightRootReviewId: highlightRootReviewId ? Number(highlightRootReviewId) : null,
        highlightReviewId: highlightReviewId ? Number(highlightReviewId) : null
      });
    });

    // Ascolta i parametri di route per caricare il ristorante corretto
    this.route.paramMap.subscribe(() => {
      this.loadFromRoute();
    });
  }

  /**
   * Carica i dati del ristorante basandosi sull'ID presente nella rotta.
   * Se l'utente è loggato, recupera anche il voto espresso dall'utente per questo ristorante.
   */
  loadFromRoute() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;

    this.restaurantService.getById(id).subscribe(data => {
      this.vm.init(data);

      if (!this.auth.isLoggedIn()) return;

      this.restaurantService.getUserVote(id).subscribe(vote => {
        this.vm.setUserVote(vote);
      });
    });
  }
}
