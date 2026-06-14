import { Injectable, signal, computed } from '@angular/core';
import { ReviewCard } from '../models/review-card.model';
import { AuthService } from '@core/services/auth.service';
import { ReviewService } from '@core/services/review.service';

@Injectable()
export class ReviewCardViewModel {

  /** Signal privato che contiene i dati della recensione. */
  private reviewState = signal<ReviewCard | null>(null);

  /** Signal pubblico (read-only) per il component. */
  review = this.reviewState.asReadonly();

  /** Signal computed che indica se l'utente è loggato. */
  private loggedInComputed = computed(() => this.auth.isLoggedIn());
  isLoggedIn = this.loggedInComputed;

  // Stato dei voti
  private userVoteState = signal<1 | -1 | 0>(0);
  private upvotesState = signal(0);
  private downvotesState = signal(0);

  /** Signal per eventuali errori durante il voto. */
  voteError = signal<string | null>(null);

  constructor(
    private reviewService: ReviewService,
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
   * @param data I dati della recensione.
   */
  init(data: ReviewCard) {
    this.reviewState.set(data);

    this.upvotesState.set(data.upvotes);
    this.downvotesState.set(data.downvotes);

    if (this.auth.isLoggedIn()) {
      this.reviewService.getUserVote(data.id).subscribe({
        next: vote => {
          this.userVoteState.set(vote);

          this.reviewState.update(old => ({
            ...old!,
            userVote: vote
          }));
        },
        error: err => {
          this.voteError.set(this.extractMessage(err));
        }
      });
    }
  }


  /** Restituisce i dati della recensione corrente. */
  reviewValue() {
    return this.reviewState();
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
    const r = this.reviewState();

    // Validazioni minime
    if (!r || !this.isLoggedIn()) return;
    if (!Number.isInteger(r.id) || r.id <= 0) return;

    const oldVote = this.userVoteState();
    const oldUp = this.upvotesState();
    const oldDown = this.downvotesState();

    this.reviewService.voteReview(r.id, type).subscribe({
      next: updated => {
        const newVote = oldVote === type ? 0 : type;

        this.upvotesState.set(updated.upvotes);
        this.downvotesState.set(updated.downvotes);

        this.reviewState.update(old => ({
          ...old!,
          ...updated,
          userVote: newVote,
          restaurantName: old!.restaurantName
        }));

        if (oldVote === type) {
          this.userVoteState.set(0);
        } else {
          this.userVoteState.set(type);
        }
      },
      error: err => {
        const msg = this.extractMessage(err);

        // rollback
        this.userVoteState.set(oldVote);
        this.upvotesState.set(oldUp);
        this.downvotesState.set(oldDown);

        this.voteError.set(msg);
      }
    });
  }
}
