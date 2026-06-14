import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ReviewTreeComponent } from '../review-tree/review-tree.component';

/**
 * Componente per la visualizzazione di un thread specifico di recensioni.
 * Viene utilizzato quando si naviga in profondità in un albero di recensioni
 * o si accede tramite link diretto a una risposta.
 */
@Component({
  selector: 'app-review-thread-page',
  standalone: true,
  imports: [CommonModule, ReviewTreeComponent],
  templateUrl: './review-thread-page.component.html',
})
export class ReviewThreadPageComponent {

  /** ID del ristorante a cui appartiene il thread. */
  restaurantId!: number;
  /** ID della recensione radice di questo thread parziale. */
  startingReviewId!: number;

  /** Flag che indica se l'utente è loggato (passato tramite state di navigazione). */
  isLoggedIn = false;
  /** ID dell'utente loggato (passato tramite state di navigazione). */
  loggedUserId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.route.paramMap.subscribe(params => {
      this.restaurantId = Number(params.get('restaurantId'));
      this.startingReviewId = Number(params.get('reviewId'));

      const nav = this.router.currentNavigation();
      const state = (nav?.extras?.state as any) || {};

      this.isLoggedIn = !!state.isLoggedIn;
      this.loggedUserId = state.loggedUserId ?? null;
    });
  }

  /**
   * Naviga indietro alla pagina di dettaglio del ristorante completo.
   */
  goBackToRestaurant() {
    this.router.navigate(['/restaurants', this.restaurantId]);
  }
}
