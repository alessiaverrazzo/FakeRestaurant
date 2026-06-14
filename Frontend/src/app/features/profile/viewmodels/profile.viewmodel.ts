import { Injectable, signal, computed, inject } from '@angular/core';
import { ProfileUser, ProfileRestaurantCard, ProfileReviewCard } from '../models/profile.model';
import { UserService } from '@core/services/user.service';
import { RestaurantService } from '@core/services/restaurant.service';
import { ReviewService } from '@core/services/review.service';

/**
 * ViewModel per la pagina del Profilo.
 * Gestisce il caricamento dei dati utente, dei ristoranti creati e delle recensioni scritte.
 * Utilizza Signals per esporre lo stato alla vista in modo reattivo.
 */
@Injectable({ providedIn: 'root' })
export class ProfileViewModel {

  // Signals privati per lo stato interno
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  private readonly _user = signal<ProfileUser | null>(null);
  private readonly _restaurants = signal<ProfileRestaurantCard[]>([]);
  private readonly _reviews = signal<ProfileReviewCard[]>([]);

  // Signals pubblici (read-only) esposti alla vista

  /** Flag di caricamento globale. */
  loading = this._loading.asReadonly();
  /** Messaggio di errore eventuale. */
  error = this._error.asReadonly();

  /** Dati dell'utente loggato. */
  user = this._user.asReadonly();
  /** Lista dei ristoranti creati dall'utente. */
  restaurants = this._restaurants.asReadonly();
  /** Lista delle recensioni scritte dall'utente. */
  reviews = this._reviews.asReadonly();

  // Computed signals per compatibilità o trasformazioni future
  restaurantsCard = computed(() => this._restaurants());
  reviewsCard = computed(() => this._reviews());

  // Servizi iniettati
  private userService = inject(UserService);
  private restaurantService = inject(RestaurantService);
  private reviewService = inject(ReviewService);

  /**
   * Carica tutti i dati del profilo (User, Restaurants, Reviews).
   * Gestisce il loading state e cattura eventuali errori per ogni richiesta.
   *
   * Nota: Le richieste vengono eseguite in parallelo.
   */
  loadProfile() {
    this._loading.set(true);
    this._error.set(null);

    const extract = (err: any) =>
      err?.error?.message ||
      err?.message ||
      "Si è verificato un errore. Riprova più tardi.";

    // 1. Carica i dati utente
    this.userService.getMe().subscribe({
      next: user => this._user.set(user),
      error: err => this._error.set(extract(err))
    });

    // 2. Carica i ristoranti dell'utente
    this.restaurantService.getMyRestaurants().subscribe({
      next: list => this._restaurants.set(list),
      error: err => this._error.set(extract(err))
    });

    // 3. Carica le recensioni dell'utente
    this.reviewService.getMyReviews().subscribe({
      next: list => {
        const mapped = list.map(r => ({
          id: r.id,
          restaurantId: r.restaurantId,
          restaurantName: r.restaurantName,
          content: r.content,
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          userVote: r.userVote ?? 0,
          user: r.user ?? null,
          createdAt: r.createdAt
        }));

        this._reviews.set(mapped);
      },
      error: err => this._error.set(extract(err)),
      complete: () => this._loading.set(false)
    });

  }
}
