import { Component, Input, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReviewCardViewModel } from '../viewmodels/review-card.viewmodel';
import { ReviewCard } from '../models/review-card.model';

import { TruncatePipe } from '../../../pipes/truncate.pipe';
import { Router } from '@angular/router';

/**
 * Componente per la visualizzazione della card di anteprima di una recensione.
 * Mostra il contenuto (troncato), i voti e permette di navigare al ristorante associato.
 * Gestisce le interazioni di voto tramite il ViewModel.
 */
@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [CommonModule, TruncatePipe],
  templateUrl: './review-card.component.html',
  styleUrls: ['./review-card.component.scss'],
  providers: [ReviewCardViewModel],
})
export class ReviewCardComponent {

  /**
   * Imposta i dati della recensione da visualizzare.
   * Inizializza il ViewModel con i nuovi dati.
   */
  @Input({ required: true }) set review(value: ReviewCard) {
    this.vm.init(value);
  }

  /** Signal che espone i dati della recensione dal ViewModel. */
  vmReview: Signal<ReviewCard | null>;
  /** Signal che indica se l'utente è loggato. */
  isLoggedIn: Signal<boolean>;

  /** Flag per gestire l'espansione del testo (se implementata nel template). */
  isExpanded = false;

  constructor(
    public vm: ReviewCardViewModel,
    private router: Router
  ) {
    this.vmReview = this.vm.review;
    this.isLoggedIn = this.vm.isLoggedIn;
  }

  /**
   * Gestisce il click sui pulsanti di voto.
   * @param type Il tipo di voto ('up' o 'down').
   */
  onVote(type: 'up' | 'down') {
    this.vm.vote(type === 'up' ? 1 : -1);
  }

  /**
   * Naviga alla pagina di dettaglio del ristorante associato alla recensione.
   */
  onDiscover() {
    const id = this.vm.reviewValue()?.restaurantId;

    if (!id || !Number.isInteger(id) || id <= 0) return;

    this.router.navigate(['/restaurants', id]);
  }
}
