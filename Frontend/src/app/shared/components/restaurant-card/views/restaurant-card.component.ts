import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestaurantCardModel } from '../models/restaurant-card.model';
import { RestaurantCardViewModel } from '../viewmodels/restaurant-card.viewmodel';
import { MiniMapComponent } from '../../mini-map/views/mini-map.component';
import { Router } from '@angular/router';

/**
 * Componente per la visualizzazione della card di anteprima di un ristorante.
 * Mostra immagine, descrizione breve, voti e una mini-mappa.
 * Gestisce le azioni di voto e la navigazione al dettaglio.
 */
@Component({
  selector: 'app-restaurant-card',
  standalone: true,
  imports: [CommonModule, MiniMapComponent],
  providers: [RestaurantCardViewModel],
  templateUrl: './restaurant-card.component.html',
  styleUrls: ['./restaurant-card.component.scss'],
})
export class RestaurantCardComponent implements OnInit {

  /** Dati del ristorante da visualizzare. */
  @Input({ required: true }) data!: RestaurantCardModel;

  constructor(public vm: RestaurantCardViewModel) {}

  private router = inject(Router);

  /**
   * Inizializza il componente.
   * Passa i dati al ViewModel per l'inizializzazione dello stato.
   */
  ngOnInit() {
    this.vm.init(this.data);
  }

  /**
   * Esegue un voto positivo (upvote).
   */
  voteUp() {
    this.vm.vote(1);
  }

  /**
   * Esegue un voto negativo (downvote).
   */
  voteDown() {
    this.vm.vote(-1);
  }

  /**
   * Naviga alla pagina di dettaglio del ristorante.
   * Verifica che l'ID sia valido prima di navigare.
   */
  goToDetails() {
    const id = this.vm.restaurant()?.id;
    if (!id || !Number.isInteger(id) || id <= 0) return;
    this.router.navigate(['/restaurants', id]);
  }
}
