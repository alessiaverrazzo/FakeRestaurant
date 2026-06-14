import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Componente per il form di creazione/risposta recensione.
 * Permette all'utente di scrivere un testo (con limite caratteri) e inviarlo.
 * Gestisce anche la visualizzazione del contatore caratteri e lo stato di login.
 */
@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-form.component.html',
  styleUrls: ['./review-form.component.scss'],
})
export class ReviewFormComponent {

  /** Placeholder per la textarea. */
  @Input() placeholder: string = "Scrivi qui...";
  /** Flag che indica se l'utente è loggato (abilita il submit). */
  @Input() isLoggedIn = false;
  /** ID della recensione padre (se è una risposta) o null (se è una nuova recensione). */
  @Input() parentReviewId: number | null = null;

  /** Lunghezza massima consentita per il contenuto. */
  readonly maxLength = 500;

  /** Signal per il contenuto testuale del form. */
  content = signal("");

  /** Evento emesso al submit del form con il contenuto e l'ID padre. */
  @Output() submitForm = new EventEmitter<{
    content: string;
    parentReviewId: number | null;
  }>();

  /** Evento emesso quando l'utente annulla l'operazione (es. chiude il form di risposta). */
  @Output() cancel = new EventEmitter<void>();

  /** Restituisce la lunghezza attuale del contenuto. */
  get length() {
    return this.content().length;
  }

  /** Verifica se il contenuto supera il limite massimo. */
  get overLimit() {
    return this.length > this.maxLength;
  }

  /**
   * Determina il colore del contatore caratteri in base alla lunghezza.
   * - Rosso se supera il limite o è molto vicino.
   * - Arancione se si avvicina al limite.
   * - Marrone scuro altrimenti.
   */
  get counterColor(): string {
    if (this.overLimit) return 'text-red-accent';
    if (this.length > this.maxLength - 40) return 'text-red-accent';
    if (this.length > this.maxLength - 100) return 'text-orange-soft';
    return 'text-brown-dark';
  }

  /**
   * Gestisce l'input dell'utente nella textarea.
   * Normalizza gli spazi bianchi e aggiorna il signal se entro i limiti.
   * @param text Il testo inserito.
   */
  onInput(text: string) {
    // Normalizza whitespace
    const clean = text.replace(/\s+/g, ' ');

    if (clean.length <= this.maxLength) {
      this.content.set(clean);
    }
  }

  /**
   * Gestisce l'invio del form.
   * Verifica login, contenuto non vuoto e limiti di lunghezza.
   * Emette l'evento submitForm e resetta il campo.
   */
  onSubmit() {
    if (!this.isLoggedIn) return;

    const text = this.content().trim();
    if (!text || this.overLimit) return;

    this.submitForm.emit({
      content: text,
      parentReviewId: this.parentReviewId,
    });

    this.content.set("");
  }
}
