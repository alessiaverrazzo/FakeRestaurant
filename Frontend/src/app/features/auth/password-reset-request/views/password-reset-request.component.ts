import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { PasswordResetRequestViewModel } from '../viewmodels/password-reset-request.viewmodel';

/**
 * Componente per la richiesta di reset della password.
 * Permette all'utente di inserire la propria email per ricevere un link di recupero.
 * Gestisce l'interazione con il ViewModel e la chiusura del modale.
 */
@Component({
  selector: 'app-password-reset-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './password-reset-request.component.html',
})
export class PasswordResetRequestComponent {

  /** Evento emesso per chiudere il modale. */
  @Output() close = new EventEmitter<void>();

  /** L'indirizzo email inserito dall'utente. */
  email = '';

  constructor(public vm: PasswordResetRequestViewModel) {}

  /**
   * Gestisce l'invio del form di richiesta.
   * Se il form è valido, invoca il ViewModel per inviare la richiesta.
   * Chiude il modale dopo 3 secondi in caso di successo.
   * @param form Il form Angular contenente i dati.
   */
  async handleSubmit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const ok = await this.vm.requestReset(this.email);

    if (ok) {
      setTimeout(() => {
        this.closeModal();
      }, 3000);
    }
  }

  /**
   * Gestisce il cambiamento dell'input email.
   * Resetta lo stato (messaggi di errore/successo) quando l'utente modifica il campo.
   */
  onInputChange() {
    if (this.vm.errorMessage() || this.vm.successMessage()) {
      this.vm.resetState();
    }
  }

  /**
   * Chiude il modale e resetta lo stato del ViewModel.
   */
  closeModal() {
    this.vm.resetState();
    this.close.emit();
  }
}
