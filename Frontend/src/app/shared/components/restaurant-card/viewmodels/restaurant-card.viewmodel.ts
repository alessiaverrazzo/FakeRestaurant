import { Injectable, signal, computed } from '@angular/core';
import { RestaurantCardModel } from '../models/restaurant-card.model';
import { RestaurantService } from '@core/services/restaurant.service';
import { AuthService } from '@core/services/auth.service';

/**
 * ViewModel per la card di anteprima del ristorante.
 * Gestisce lo stato locale della card, inclusi i voti (con logica ottimistica)
 * e la visualizzazione della descrizione ridotta.
 */
@Injectable()
export class RestaurantCardViewModel {

  /** Signal privato che contiene i dati del ristorante. */
  private restaurantState = signal<RestaurantCardModel | null>(null);

  /** Signal computed che indica se l'utente è loggato. */
  isLoggedIn = computed(() => this.auth.isLoggedIn());

  // Stato dei voti
  private userVoteState = signal<1 | -1 | 0>(0);
  private upvotesState = signal(0);
  private downvotesState = signal(0);

  /** Signal per eventuali errori durante il voto. */
  voteError = signal<string | null>(null);

  constructor(
    private restaurantService: RestaurantService,
    private auth: AuthService
  ) {}

  /**
   * Estrae un messaggio di errore leggibile dall'oggetto errore.
   */
  private extractMessage(err: any): string {
    return (
      err?.error?.message ||
      err?.message ||
      "Si è verificato un errore. Riprova più tardi."
    );
  }

  /**
   * Inizializza il ViewModel con i dati della card.
   * Se l'utente è loggato, recupera anche il voto espresso.
   * @param data I dati del ristorante.
   */
  init(data: RestaurantCardModel) {
    this.restaurantState.set(data);

    this.upvotesState.set(data.upvotes);
    this.downvotesState.set(data.downvotes);

    // carica voto utente reale, se loggato
    if (this.auth.isLoggedIn()) {
      this.restaurantService.getUserVote(data.id).subscribe({
        next: vote => this.userVoteState.set(vote),
        error: err => {
          this.voteError.set(this.extractMessage(err));
        }
      });
    }
  }

  /** Restituisce i dati del ristorante corrente. */
  restaurant() {
    return this.restaurantState();
  }

  /** Restituisce il voto attuale dell'utente. */
  userVote() {
    return this.userVoteState();
  }

  /** Restituisce il numero netto di upvotes. */
  netUpvotes() {
    return this.upvotesState();
  }

  /** Restituisce il numero netto di downvotes. */
  netDownvotes() {
    return this.downvotesState();
  }

  /**
   * Gestisce il voto (upvote/downvote) con logica ottimistica.
   * @param type Il tipo di voto (1 o -1).
   */
  vote(type: 1 | -1) {
    const r = this.restaurantState();
    // Validazione minima
    if (!r || !this.isLoggedIn()) return;
    if (!Number.isInteger(r.id) || r.id <= 0) return;

    const oldVote = this.userVoteState();
    const oldUp = this.upvotesState();
    const oldDown = this.downvotesState();

    this.restaurantService.voteRestaurant(r.id, type).subscribe({
      next: updated => {
        this.restaurantState.set(updated);
        this.upvotesState.set(updated.upvotes);
        this.downvotesState.set(updated.downvotes);
        if (oldVote === type) {
          this.userVoteState.set(0);
        } else {
          this.userVoteState.set(type);
        }
      },
      error: err => {
        const message = this.extractMessage(err);

        this.userVoteState.set(oldVote);
        this.upvotesState.set(oldUp);
        this.downvotesState.set(oldDown);

        this.voteError.set(message);
      }
    });
  }

  /**
   * Restituisce una versione troncata della descrizione per l'anteprima.
   */
  get shortDescription(): string {
    const r = this.restaurantState();
    if (!r) return '';
    const text = r.description?.trim() ?? '';
    const clean = text.replace(/\s+/g, ' ');
    return clean.length > 150 ? clean.slice(0, 150) + '…' : clean;
  }
}
