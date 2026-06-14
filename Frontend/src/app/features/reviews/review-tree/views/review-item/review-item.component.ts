import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewTreeModel } from '../../models/review-tree.model';
import { TruncatePipe } from '@shared/pipes';

/**
 * Componente per la visualizzazione di una singola recensione nell'albero.
 * Gestisce le interazioni locali (voto, risposta, modifica, eliminazione)
 * e la logica di visualizzazione (indentazione, apertura thread).
 */
@Component({
  selector: 'app-review-item',
  standalone: true,
  imports: [CommonModule, FormsModule, TruncatePipe],
  templateUrl: './review-item.component.html',
  styleUrls: ['./review-item.component.scss'],
})
export class ReviewItemComponent {

  /** Modello della recensione da visualizzare. */
  @Input({ required: true }) review!: ReviewTreeModel;
  /** Flag che indica se l'utente è loggato. */
  @Input() isLoggedIn: boolean = false;
  /** ID dell'utente loggato (per verificare ownership). */
  @Input() loggedUserId: number | null = null;
  /** ID della recensione di partenza (se siamo in una vista thread). */
  @Input() startingReviewId: number | null = null;
  /** Livello di profondità iniziale (per calcolo indentazione relativa). */
  @Input() startingLevel: number = 0;

  /** Evento emesso per aprire un thread specifico. */
  @Output() openThread = new EventEmitter<ReviewTreeModel>();
  /** Evento emesso per votare (up/down). */
  @Output() vote = new EventEmitter<{ type: 'up' | 'down', id: number}>();
  /** Evento emesso quando una recensione viene modificata. */
  @Output() reviewUpdated = new EventEmitter<{ id: number; content: string }>();
  /** Evento emesso quando una recensione viene eliminata. */
  @Output() reviewDeleted = new EventEmitter<number>();
  /** Evento emesso quando viene creata una risposta. */
  @Output() replyCreated = new EventEmitter<{ parentId: number; content: string }>();

  /** Flag per rilevare dispositivi mobili (usato per limitare la profondità). */
  isMobile = window.innerWidth < 640;

  /** Stato del modale di eliminazione. */
  showDeleteModal = false;

  /**
   * Calcola i pixel di indentazione in base al livello.
   * Le risposte dirette (livello > 0) hanno un margine sinistro.
   */
  get indentPx(): number {
    return this.review.level > 0 ? 8 : 0;
  }

  /** Verifica se siamo all'interno di una pagina di thread specifico. */
  get inThreadPage(): boolean {
    return this.startingReviewId !== null;
  }

  // Stato modifica
  editMode = false;
  editContent = '';

  /**
   * Attiva la modalità di modifica della recensione.
   * Copia il contenuto attuale in una variabile temporanea.
   */
  toggleEditMode() {
    this.editMode = true;
    this.editContent = this.review.content.slice(0, 500);
  }

  /** Annulla la modifica. */
  cancelEdit() {
    this.editMode = false;
  }

  /** Salva le modifiche se il contenuto è valido. */
  saveEdit() {
    const trimmed = this.editContent.trim();
    if (!trimmed) return;

    this.editMode = false;
    this.reviewUpdated.emit({
      id: this.review.id,
      content: trimmed,
    });
  }

  // Stato form risposta
  replyContent = '';
  maxReplyLength = 500;

  get replyLength() {
    return this.replyContent.length;
  }

  get replyOverLimit() {
    return this.replyLength > this.maxReplyLength;
  }

  /**
   * Determina il colore del contatore caratteri per la risposta.
   * - Rosso se supera il limite o è molto vicino.
   * - Arancione se si avvicina al limite.
   * - Marrone scuro altrimenti.
   */
  get replyCounterColor() {
    if (this.replyOverLimit) return 'text-red-accent';
    if (this.replyLength > this.maxReplyLength - 40) return 'text-red-accent';
    if (this.replyLength > this.maxReplyLength - 100) return 'text-orange-soft';
    return 'text-brown-dark';
  }

  /** Apre o chiude il form di risposta. */
  toggleReplyForm() {
    this.review.replyFormOpen = !this.review.replyFormOpen;
    this.replyContent = '';
  }

  /** Invia la risposta se valida e l'utente è loggato. */
  submitReply() {
    if (!this.isLoggedIn || this.replyOverLimit) return;

    const text = this.replyContent.replace(/\s+/g, ' ').trim();
    if (!text) return;

    this.replyCreated.emit({
      parentId: this.review.id,
      content: text,
    });

    this.toggleReplyForm();
  }

  /**
   * Gestisce il voto (upvote/downvote).
   * @param type Tipo di voto.
   */
  toggleVote(type: 'up' | 'down') {
    if (!this.isLoggedIn) return;
    this.vote.emit({ type, id: this.review.id });
  }

  /** Apre il modale di conferma eliminazione. */
  openDeleteModal() {
    this.showDeleteModal = true;
  }

  /** Chiude il modale di conferma eliminazione. */
  closeDeleteModal() {
    this.showDeleteModal = false;
  }

  /** Conferma l'eliminazione ed emette l'evento. */
  confirmDelete() {
    this.showDeleteModal = false;
    this.reviewDeleted.emit(this.review.id);
  }

  /**
   * Determina se mostrare il link per aprire il thread separato.
   * Basato sulla profondità corrente e sulla larghezza dello schermo (responsive).
   * @returns true se il thread deve essere aperto in una nuova vista.
   */
  shouldOpenThread(): boolean {
    const limit = this.getDepthLimit();

    // ===== PAGINA RISTORANTE =====
    // si mostra fino al livello = limit (mobile: 4, tablet: 9, desktop: 14)
    if (!this.inThreadPage) {
      return (
        this.review.level === limit &&
        this.review.maxSubtreeLevel > limit
      );
    }

    // ===== THREAD PAGE =====
    const start = this.startingLevel;
    const end = start + limit;

    return (
      this.review.level === end &&
      this.review.maxSubtreeLevel > end
    );
  }

  /**
   * Restituisce il limite di profondità in base alla larghezza dello schermo.
   * (Mobile: 4, Tablet: 9, Desktop: 14).
   */
  getDepthLimit(): number {
    const width = window.innerWidth;

    if (width < 640) return 4;       // mobile
    if (width < 1024) return 9;     // tablet
    return 14;                      // desktop
  }

  /** Gestisce il click sul link "Continua a leggere il thread". */
  onOpenThreadClick() {
    if (!this.shouldOpenThread()) return;
    this.openThread.emit(this.review);
  }

}
