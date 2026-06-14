import { Injectable, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { RestaurantDetailModel } from '../models/restaurant-detail.model';
import { RestaurantService } from '@core/services/restaurant.service';
import { AuthService } from '@core/services/auth.service';

/**
 * ViewModel per la pagina di dettaglio del ristorante.
 * Gestisce lo stato del ristorante, i permessi utente (owner), la modalità di modifica,
 * i voti e le operazioni di eliminazione.
 */
@Injectable()
export class RestaurantDetailViewModel {

  /** Signal che contiene i dati del ristorante visualizzato. */
  restaurant = signal<RestaurantDetailModel | null>(null);

  /** Signal computed che indica se l'utente è loggato. */
  isLoggedIn = computed(() => this.auth.isLoggedIn());

  /** Signal computed che indica se l'utente loggato è il proprietario del ristorante. */
  isOwner = computed(() => {
    const r = this.restaurant();
    const u = this.auth.user;
    if (!r || !u) return false;
    return r.userId === u.id;
  });

  /** Restituisce l'ID dell'utente loggato o null se non autenticato. */
  get loggedUserId(): number | null {
    return this.auth.user?.id ?? null;
  }

  /** Signal per attivare/disattivare la modalità di modifica. */
  editMode = signal<boolean>(false);
  /** Signal per il nome in fase di modifica. */
  editName = signal<string>('');
  /** Signal per la descrizione in fase di modifica. */
  editDescription = signal<string>('');

  /** Signal per lo stato di caricamento durante l'aggiornamento. */
  loadingUpdate = signal<boolean>(false);
  /** Signal per eventuali errori durante l'aggiornamento. */
  errorUpdate = signal<string | null>(null);

  // Stato dei voti
  private userVoteState = signal<1 | -1 | 0>(0);
  private upvotesState = signal<number>(0);
  private downvotesState = signal<number>(0);
  /** Signal per errori relativi al voto. */
  errorVote = signal<string | null>(null);

  /** Signal per gestire l'espansione della descrizione lunga. */
  expanded = signal<boolean>(false);
  /** Limite di caratteri per la descrizione ridotta. */
  readonly COLLAPSE_LIMIT = 350;

  /** Signal per mostrare/nascondere il modale di eliminazione. */
  showDeleteModal = signal<boolean>(false);
  /** Signal per lo stato di caricamento durante l'eliminazione. */
  loadingDelete = signal<boolean>(false);

  /** ID della recensione radice da evidenziare */
  highlightRootReviewId = signal<number | null>(null);
  /** ID della recensione specifica da evidenziare. */
  highlightReviewId = signal<number | null>(null);

  constructor(
    private router: Router,
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
   * Imposta i parametri per evidenziare una recensione specifica all'avvio.
   */
  setHighlightParams(data: {
    highlightRootReviewId: number | null;
    highlightReviewId: number | null;
  }) {
    this.highlightRootReviewId.set(data.highlightRootReviewId);
    this.highlightReviewId.set(data.highlightReviewId);
  }

  /**
   * Inizializza il ViewModel con i dati del ristorante recuperati dal backend.
   * Imposta anche lo stato iniziale dei voti e dei campi di modifica.
   * @param data I dati del ristorante.
   */
  init(data: RestaurantDetailModel) {
    this.restaurant.set(data);

    this.upvotesState.set(data.upvotes);
    this.downvotesState.set(data.downvotes);

    this.editName.set(data.name.trim());
    this.editDescription.set(data.description.trim());
  }

  /**
   * Imposta lo stato locale del voto utente.
   * @param vote Il valore del voto (1, -1, 0).
   */
  setUserVote(vote: 1 | -1 | 0) {
    this.userVoteState.set(vote);
  }

  /** Restituisce il voto attuale dell'utente. */
  userVote() {
    return this.userVoteState();
  }

  /** Restituisce il numero corrente di upvotes. */
  netUpvotes() {
    return this.upvotesState();
  }

  /** Restituisce il numero corrente di downvotes. */
  netDownvotes() {
    return this.downvotesState();
  }

  /**
   * Gestisce il voto (upvote/downvote) con logica ottimistica (rollback in caso di errore).
   * Se l'utente clicca lo stesso voto già attivo, lo rimuove (toggle).
   * @param type Il tipo di voto (1 o -1).
   */
  vote(type: 1 | -1) {
    const r = this.restaurant();
    if (!r) return;
    if (!this.isLoggedIn()) return;

    this.errorVote.set(null);

    // Stato precedente
    const prevVote = this.userVoteState();
    const prevUp = this.upvotesState();
    const prevDown = this.downvotesState();

    this.restaurantService.voteRestaurant(r.id, type).subscribe({
      next: updated => {
        this.restaurant.set(updated);
        this.upvotesState.set(updated.upvotes);
        this.downvotesState.set(updated.downvotes);

        // Se l’utente ha cliccato di nuovo lo stesso voto → annullo
        if (prevVote === type) {
          this.userVoteState.set(0);
        } else {
          this.userVoteState.set(type);
        }
      },
      error: (err) => {
        // Ripristina stato precedente
        this.userVoteState.set(prevVote);
        this.upvotesState.set(prevUp);
        this.downvotesState.set(prevDown);

        this.errorVote.set(this.extractMessage(err));
      }
    });
  }

  /**
   * Attiva la modalità di modifica popolando i campi con i valori attuali.
   */
  startEditing() {
    const r = this.restaurant();
    if (!r) return;

    this.editName.set(r.name);
    this.editDescription.set(r.description);
    this.editMode.set(true);
  }

  /**
   * Annulla la modifica e ripristina lo stato di visualizzazione.
   */
  cancelEditing() {
    this.editMode.set(false);
    this.errorUpdate.set(null);
  }

  /**
   * Salva le modifiche apportate al ristorante (nome, descrizione).
   * Esegue validazioni lato client prima di inviare la richiesta.
   */
  saveChanges() {
    const r = this.restaurant();
    if (!r) return;

    this.loadingUpdate.set(true);
    this.errorUpdate.set(null);

    // Validazioni input
    const name = this.editName().trim();
    const description = this.editDescription().trim();

    // Nome richiesto + lunghezza massima
    if (name.length === 0 || name.length > 255) {
      this.loadingUpdate.set(false);
      this.errorUpdate.set("Il nome deve essere tra 1 e 255 caratteri.");
      return;
    }

    // Descrizione richiesta + lunghezza massima
    if (description.length === 0 || description.length > 2000) {
      this.loadingUpdate.set(false);
      this.errorUpdate.set("La descrizione può contenere massimo 2000 caratteri.");
      return;
    }

    // Update
    this.restaurantService.update(r.id, {
      name,
      description,
    }).subscribe({
      next: updated => {
        const old = this.restaurant();

        // Manteniamo username e iconId
        this.restaurant.set({
          ...old!,
          ...updated,
          username: old!.username,
          iconId: old!.iconId

        });
        this.editMode.set(false);
        this.loadingUpdate.set(false);
      },
      error: (err) => {
        this.errorUpdate.set(this.extractMessage(err));
        this.loadingUpdate.set(false);
      }
    });
  }

  /** Restituisce la descrizione completa del ristorante. */
  fullDescription() {
    return this.restaurant()?.description ?? '';
  }

  /** Signal computed che indica se la descrizione necessita di essere troncata. */
  needsCollapse = computed(() => {
    const text = this.restaurant()?.description ?? '';
    return text.length > this.COLLAPSE_LIMIT;
  });

  /** Signal computed che restituisce il testo da visualizzare (troncato o completo). */
  visibleText = computed(() => {
    const text = this.restaurant()?.description ?? '';
    if (!this.needsCollapse()) return text;
    if (this.expanded()) return text;
    return text.slice(0, this.COLLAPSE_LIMIT) + '…';
  });

  /** Inverte lo stato di espansione della descrizione. */
  toggleExpanded() {
    this.expanded.update(v => !v);
  }

  /** Apre il modale di conferma eliminazione. */
  openDeleteModal() {
    this.showDeleteModal.set(true);
  }

  /** Chiude il modale di conferma eliminazione. */
  closeDeleteModal() {
    this.showDeleteModal.set(false);
  }

  /**
   * Conferma l'eliminazione del ristorante.
   * Invia la richiesta al backend e reindirizza alla home in caso di successo.
   */
  confirmDelete() {
    const r = this.restaurant();
    if (!r) return;

    this.loadingDelete.set(true);

    this.restaurantService.delete(r.id).subscribe({
      next: () => {
        this.loadingDelete.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loadingDelete.set(false);
        this.errorUpdate.set(this.extractMessage(err));
      }
    });
  }
}
