import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ProfileViewModel } from '../viewmodels/profile.viewmodel';

import { RestaurantCardComponent } from '@shared/components/restaurant-card/views/restaurant-card.component';
import { ReviewCardComponent } from '@shared/components/review-card/views/review-card.component';
import { HorizontalScrollerComponent } from '@shared/components/horizontal-scroller/horizontal-scroller.component';

/**
 * Componente per la visualizzazione del Profilo Utente.
 * Mostra i dettagli dell'utente loggato, la lista dei suoi ristoranti e le sue recensioni.
 * Delega la logica di recupero dati al ProfileViewModel.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RestaurantCardComponent,
    ReviewCardComponent,
    HorizontalScrollerComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {

  constructor(public vm: ProfileViewModel) {}

  /**
   * Inizializza il componente.
   * Richiede al ViewModel di caricare i dati del profilo (utente, ristoranti, recensioni).
   */
  ngOnInit(): void {
    this.vm.loadProfile();
  }
}
