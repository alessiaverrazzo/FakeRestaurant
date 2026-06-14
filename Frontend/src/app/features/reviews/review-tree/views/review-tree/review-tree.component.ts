import { Component, Input, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ReviewService } from '@core/services/review.service';
import { ReviewTreeViewModel } from '../../viewmodels/review-tree.viewmodel';
import { ReviewTreeModel } from '../../models/review-tree.model';

import { ReviewItemComponent } from '../review-item/review-item.component';
import { ReviewFormComponent } from '../review-form/review-form.component';

/**
 * Componente principale per la visualizzazione dell'albero delle recensioni.
 * Gestisce il caricamento, l'ordinamento, il filtraggio per thread e la logica di visualizzazione (profondità, highlight).
 * Coordina le interazioni utente (creazione, voto, modifica, eliminazione) delegando al servizio.
 */
@Component({
  selector: 'app-review-tree',
  standalone: true,
  imports: [
    CommonModule,
    ReviewItemComponent,
    ReviewFormComponent,
  ],
  templateUrl: './review-tree.component.html'
})
export class ReviewTreeComponent implements OnChanges {

  /** ID del ristorante di cui mostrare le recensioni. */
  @Input({ required: true }) restaurantId!: number;
  /** Flag che indica se l'utente è loggato. */
  @Input() isLoggedIn = false;
  /** ID dell'utente loggato. */
  @Input() loggedUserId: number | null = null;

  /** ID della recensione di partenza se si sta visualizzando un thread specifico. */
  @Input() startingReviewId: number | null = null;

  /** ID della recensione radice da evidenziare (per deep linking/notifiche). */
  @Input() highlightRootReviewId: number | null = null;
  /** ID della recensione specifica da evidenziare. */
  @Input() highlightReviewId: number | null = null;

  /** Signal per la modalità di ordinamento corrente. */
  sortMode = signal<'best' | 'newest' | 'oldest'>('best');

  /** Signal che contiene l'albero delle recensioni da visualizzare. */
  reviewsTree = signal<ReviewTreeModel[]>([]);
  /** Signal per il thread selezionato */
  selectedThread = signal<ReviewTreeModel | null>(null);

  /** Signal per errori globali del componente. */
  globalError = signal<string | null>(null);

  private vm = new ReviewTreeViewModel();

  constructor(
    private reviewService: ReviewService,
    private router: Router,
  ) {}

  /**
   * Gestisce i cambiamenti degli input.
   * Ricarica le recensioni se cambiano parametri critici come restaurantId, startingReviewId o highlight.
   * @param changes Oggetto SimpleChanges di Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const restaurantChanged =
      !!changes['restaurantId'] && this.restaurantId;

    const startingChanged =
      !!changes['startingReviewId'] && !changes['startingReviewId'].firstChange;

    const highlightChanged =
      !this.startingReviewId && // solo pagina ristorante, non thread page
      ( !!changes['highlightRootReviewId'] || !!changes['highlightReviewId'] );

    // Se cambia il ristorante o la startingReview, resettiamo lo stato
    if (restaurantChanged || startingChanged) {
      this.reviewsTree.set([]);
      this.selectedThread.set(null);
    }

    // Se succede una di queste tre cose → ricarichiamo l'albero:
    // - è cambiato il ristorante
    // - è cambiata la startingReview (thread page)
    // - sono cambiati i parametri di highlight
    if (restaurantChanged || startingChanged || highlightChanged) {
      this.loadReviews();
    }
  }

  /**
   * Gestisce gli errori delle chiamate HTTP impostando il messaggio globale.
   * @param err L'errore ricevuto.
   */
  private handleError(err: any) {
    const message =
      err?.error?.message ||
      err?.message ||
      "Si è verificato un errore. Riprova più tardi.";

    this.globalError.set(message);
  }

  /**
   * Restituisce il limite di profondità dell'albero in base alla larghezza dello schermo.
   * (Mobile: 4, Tablet: 9, Desktop: 14).
   */
  private getDepthLimit(): number {
    const width = window.innerWidth;

    if (width < 640) return 4;      // mobile: mostra livelli 0..4
    if (width < 1024) return 9;     // tablet: 0..9
    return 14;                      // desktop: 0..14
  }

  /**
   * Applica ricorsivamente il limite di profondità all'albero.
   * Tronca i rami che superano il limite impostando `hasMoreChildren`.
   * @param node Il nodo corrente.
   * @param limit Il livello massimo consentito.
   */
  private applyDepthLimit(node: ReviewTreeModel, limit: number): ReviewTreeModel | null {
    // Se supera il limite, NON deve più apparire
    if (node.level > limit) {
      return null;
    }

    // Al limite: il nodo appare ma NON deve avere figli
    if (node.level === limit) {
      return {
        ...node,
        hasMoreChildren: node.replies.length > 0,
        replies: []  // tronca figli
      };
    }

    // sotto al limite filtra i figli
    const filteredReplies = node.replies
      .map(child => this.applyDepthLimit(child, limit))
      .filter((child): child is ReviewTreeModel => child !== null);

    return {
      ...node,
      hasMoreChildren: node.replies.length > filteredReplies.length,
      replies: filteredReplies
    };
  }

  /**
   * Filtra l'albero per mostrare solo il thread relativo a `startingReviewId`.
   * Normalizza i livelli in modo che la radice del thread parta da 0 (o relativo).
   * @param tree L'albero completo.
   */
  private filterThreadView(tree: ReviewTreeModel[]): ReviewTreeModel[] {
    if (!this.startingReviewId) return tree;

    const flat = this.vm.flattenTree(tree);
    const root = flat.find(r => r.id === this.startingReviewId);
    if (!root) return [];

    const originalRootLevel = root.level;
    const limit = this.getDepthLimit();
    const startLevel = originalRootLevel;
    const endLevel = originalRootLevel + limit;

    const normalizeLevels = (node: ReviewTreeModel): ReviewTreeModel => ({
      ...node,
      level: node.level - originalRootLevel,
      replies: node.replies.map(normalizeLevels)
    });

    const filterNode = (node: ReviewTreeModel): ReviewTreeModel | null => {
      if (node.level < startLevel || node.level > endLevel) return null;

      const filteredChildren = node.replies
        .map(child => filterNode(child))
        .filter((x): x is ReviewTreeModel => x !== null);

      const maxChildLevel = filteredChildren.length
        ? Math.max(...filteredChildren.map(c => c.maxSubtreeLevel))
        : node.level;

      return {
        ...node,
        maxSubtreeLevel: maxChildLevel,
        hasMoreChildren: node.maxSubtreeLevel > endLevel,
        replies: filteredChildren
      };
    };

    const filteredRoot = filterNode(root);
    return filteredRoot ? [normalizeLevels(filteredRoot)] : [];
  }

  /**
   * Trova un nodo nell'albero tramite ID.
   */
  private findNodeById(tree: ReviewTreeModel[], id: number): ReviewTreeModel | null {
    const flat = this.vm.flattenTree(tree);
    return flat.find(n => n.id === id) ?? null;
  }

  /**
   * Clona un sottoalbero per promuoverlo in cima alla lista (per l'highlight).
   * Gestisce la logica di visualizzazione per notifiche di risposta o voto.
   */
  private cloneSubtree(root: ReviewTreeModel, highlightId: number): ReviewTreeModel {
    const base = root.level;

    /** CASO 1: il nodo da promuovere é anche quello da evidenziare
      (new_review oppure voto sulla review root) */
    if (root.id === highlightId) {
      const cloneDeep = (node: ReviewTreeModel): ReviewTreeModel => ({
        ...node,
        isHighlighted: node.id === highlightId,
        highlightSource: node.id === highlightId ? 'notification' : null,
        level: node.level - base,
        replies: node.replies.map(cloneDeep)
      });

      return cloneDeep(root);
    }

    /** CASO 2: highlight è dentro la subtree di root
      tipicamente: notifica di REPLY
      root = padre, highlightId = nuova risposta */
    const clonedRoot: ReviewTreeModel = {
      ...root,
      isHighlighted: false,
      highlightSource: null,
      level: 0,
      // ora profondità massima = 1 (lui + figli)
      maxSubtreeLevel: 1,
      hasMoreChildren: false,
      replies: []
    };

    /** Prendiamo solo i figli diretti del padre,
      togliendo eventuali sotto-alberi profondi */
    const directChildren = root.replies.map(child => ({
      ...child,
      level: 1,
      isHighlighted: child.id === highlightId,
      highlightSource: child.id === highlightId ? 'notification' as const: null,
      replies: [],           //niente nipoti
      hasMoreChildren: false,
      maxSubtreeLevel: 1
    }));

    clonedRoot.replies = directChildren;

    return clonedRoot;
  }

  /**
   * Applica le trasformazioni all'albero grezzo:
   * 1. Gestione Highlight (promozione sottoalbero).
   * 2. Filtro Thread Page (se attivo).
   * 3. Limite profondità (se pagina ristorante normale).
   * @param tree L'albero grezzo costruito dal ViewModel.
   */
  private applyTree(tree: ReviewTreeModel[]) {
    // ====== SISTEMA HIGHLIGHT (notifiche) ======
    if (!this.startingReviewId && this.highlightRootReviewId && this.highlightReviewId) {

      const rootNode = this.findNodeById(tree, this.highlightRootReviewId);

      if (rootNode) {
        // Clona il sottoalbero da portare in alto
        const promoted = this.cloneSubtree(rootNode, this.highlightReviewId);

        // Mostra questo thread in cima all’albero
        this.reviewsTree.set([promoted, ...tree]);

        // Scroll automatico all’elemento evidenziato
        setTimeout(() => {
          this.scrollToReview(this.highlightReviewId!);
        }, 60);

        return;
      }
    }

    // THREAD PAGE
    if (this.startingReviewId) {
      const filtered = this.filterThreadView(tree);
      this.reviewsTree.set(filtered);
      return;
    }

    // PAGINA RISTORANTE NORMALE
    const limit = this.getDepthLimit();
    const limited = tree
      .map(r => this.applyDepthLimit(r, limit))
      .filter((x): x is ReviewTreeModel => x !== null);

    this.reviewsTree.set(limited);
  }

  /**
   * Carica le recensioni dal backend.
   * Costruisce l'albero e, se l'utente è loggato, recupera i voti utente in parallelo.
   */
  loadReviews() {
    const mode = this.sortMode().toUpperCase() as 'BEST' | 'NEWEST' | 'OLDEST';

    this.reviewService.getByRestaurantId(this.restaurantId, mode)
    .subscribe({
      next: reviews => {
        // Costruisci albero
        const tree = this.vm.buildTree(reviews);

        // Se non loggato: nessuna chiamata aggiuntiva
        if (!this.isLoggedIn || !this.loggedUserId) {
          this.applyTree(tree);
          return;
        }

        // Lista piatta di tutte le recensioni (root + figli)
        const flat = this.vm.flattenTree(tree);

        // Per ogni recensione: chiamata userVote
        let completed = 0;

        flat.forEach(node => {
          this.reviewService.getUserVote(node.id).subscribe({
            next: res => {
              node.userVote = res;
            },
            error: () => {
              node.userVote = 0; // fallback
            },
            complete: () => {
              completed++;
              if (completed === flat.length) {
                // dopo aver aggiornato tutti i voti: aggiorna UI
                this.applyTree(tree);
              }
            }
          });
        });
      },
      error: err => this.handleError(err)
    });
  }

  /**
   * Cambia la modalità di ordinamento e ricarica le recensioni.
   * @param mode 'best', 'newest', o 'oldest'.
   */
  changeSort(mode: 'best' | 'newest' | 'oldest') {
    this.sortMode.set(mode);
    this.loadReviews();
  }

  /**
   * Gestisce la creazione di una nuova recensione radice.
   */
  onSubmitRootReview(e: { content: string }) {
    const text = e.content.trim();
    if (!text || text.length > 500) return;

    this.reviewService.create({
      restaurantId: this.restaurantId,
      content: text,
      parentReviewId: null
    }).subscribe({
      next: () => this.loadReviews(),
      error: err => this.handleError(err)
    });
  }

  /**
   * Gestisce la creazione di una risposta a una recensione.
   * Aggiunge localmente la risposta all'albero per feedback immediato.
   */
  onReplyCreated(e: { parentId: number; content: string }) {
    const text = e.content.replace(/\s+/g, " ").trim();
    if (!text || text.length > 500) return;

    this.reviewService.create({
      restaurantId: this.restaurantId,
      content: text,
      parentReviewId: e.parentId
    }).subscribe({
      next: newReply => {
        const tree = this.reviewsTree();
        const flat = this.vm.flattenTree(tree);
        const parent = flat.find(r => r.id === e.parentId);
        if (!parent) return;

        const child: ReviewTreeModel = {
          id: newReply.id,
          userId: newReply.userId,
          restaurantId: newReply.restaurantId,
          parentReviewId: newReply.parentReviewId ?? null,
          content: newReply.content,
          createdAt: newReply.createdAt,
          updatedAt: newReply.updatedAt,

          upvotes: newReply.upvotes,
          downvotes: newReply.downvotes,

          user: newReply.user
            ? {
                username: newReply.user.username,
                iconId: newReply.user.iconId,
              }
            : null,

          restaurantName: newReply.restaurantName ?? null,
          userVote: 0,

          replies: [],
          level: parent.level + 1,
          collapsed: false,
          replyFormOpen: false,
          hasMoreChildren: false,
          maxSubtreeLevel: parent.level + 1,
        };

        parent.replies = [...parent.replies, child];
        this.reviewsTree.set([...tree]);

        this.reviewService.getUserVote(child.id).subscribe(v => {
          child.userVote = v;
          this.reviewsTree.set([...tree]);
        });
      },
      error: err => this.handleError(err)
    });
  }

  /**
   * Gestisce l'aggiornamento del contenuto di una recensione.
   */
  onReviewUpdated(e: { id: number; content: string }) {
    const text = e.content.replace(/\s+/g, " ").trim();
    if (!text || text.length > 500) return;

    this.reviewService.update({
      id: e.id,
      content: text
    }).subscribe({
      next: () => this.loadReviews(),
      error: err => this.handleError(err)
    });
  }

  /**
   * Gestisce l'eliminazione di una recensione.
   * Rimuove il nodo dall'albero locale.
   */
  onDeleteReview(id: number) {
    const tree = this.reviewsTree();
    const flat = this.vm.flattenTree(tree);

    this.reviewService.delete(id).subscribe({
      next: () => {
        // Controllo: è una root?
        const isRoot = tree.some(r => r.id === id);

        if (isRoot) {
          // rimuovi solo la root
          const newTree = tree.filter(r => r.id !== id);
          this.reviewsTree.set(newTree);
          return;
        }

        // Non è root → rimuovi dal parent
        const parent = flat.find(n => n.replies.some(r => r.id === id));
        if (!parent) return;

        parent.replies = parent.replies.filter(r => r.id !== id);

        // aggiorna UI
        this.reviewsTree.set([...tree]);
      },
      error: err => this.handleError(err)
    });
  }

  /**
   * Gestisce il voto su una recensione.
   * Applica un aggiornamento ottimistico locale e poi sincronizza col backend.
   */
  onVote(type: 'up' | 'down', reviewId: number) {
    const voteValue = type === 'up' ? 1 as const : -1 as const;

    // Trova il nodo da aggiornare
    const tree = this.reviewsTree();
    const flat = this.vm.flattenTree(tree);
    const node = flat.find(r => r.id === reviewId);
    if (!node) return;

    // Stato precedente (per rollback)
    const prevVote = node.userVote;
    const prevUp = node.upvotes;
    const prevDown = node.downvotes;

    // Aggiornamento locale ottimistico
    this.applyLocalVote(node, voteValue);

    this.reviewsTree.set([...tree]);

    // Invio reale al backend
    this.reviewService.voteReview(reviewId, voteValue).subscribe({
      next: updated => {
        node.upvotes = updated.upvotes;
        node.downvotes = updated.downvotes;

        this.reviewsTree.set([...tree]);
      },
      error: () => {
        // rollback
        node.userVote = prevVote;
        node.upvotes = prevUp;
        node.downvotes = prevDown;

        this.reviewsTree.set([...tree]);
      }
    });
  }

  /**
   * Applica l'aggiornamento locale dei contatori di voto (logica ottimistica).
   */
  private applyLocalVote(node: ReviewTreeModel, vote: 1 | -1) {
    const prev = node.userVote;

    // Se clicca lo stesso voto: annullo
    if (prev === vote) {
      if (vote === 1) node.upvotes--;
      else node.downvotes--;
      node.userVote = 0;
    }
    else {
      // nuovo voto
      if (vote === 1) {
        node.upvotes++;
        if (prev === -1) node.downvotes--;
      } else {
        node.downvotes++;
        if (prev === 1) node.upvotes--;
      }
      node.userVote = vote;
    }
  }

  /**
   * Gestisce la navigazione verso la pagina di dettaglio di un thread.
   */
  onOpenThread(node: ReviewTreeModel) {
    // dalla pagina ristorante
    if (!this.startingReviewId) {
      this.router.navigate(
        ['/restaurants', node.restaurantId, 'review-thread', node.id],
        { state: { isLoggedIn: this.isLoggedIn, loggedUserId: this.loggedUserId } }
      );
      return;
    }

    // dalla thread page: si continua dal nodo cliccato
    this.router.navigate(
      ['/restaurants', node.restaurantId, 'review-thread', node.id],
      { state: { isLoggedIn: this.isLoggedIn, loggedUserId: this.loggedUserId } }
    );
  }

  /**
   * Esegue lo scroll verso una recensione specifica dopo il rendering.
   * Utilizza un meccanismo di retry per attendere che il DOM sia pronto.
   */
  private scrollToReview(id: number) {

    const attemptScroll = (retries = 10) => {
      const el = document.getElementById(`review-${id}`);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // se il nodo non è ancora renderizzato: riprova
      if (retries > 0) {
        setTimeout(() => attemptScroll(retries - 1), 40);
      }
    };

    // aspettiamo il render Angular + il render DOM effettivo
    queueMicrotask(() => {
      setTimeout(() => attemptScroll(), 40);
    });
  }
}
