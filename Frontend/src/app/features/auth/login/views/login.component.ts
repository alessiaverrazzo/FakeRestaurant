import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginViewModel } from '../viewmodels/login.viewmodel';

/**
 * Componente per la vista di Login.
 * Gestisce l'interazione utente per l'inserimento delle credenziali e delega la logica al ViewModel.
 * Emette eventi per la navigazione verso altre viste (registrazione, reset password) o per la chiusura del modale.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  providers: [LoginViewModel]
})
export class LoginComponent {

  /** Evento emesso quando il login ha successo o l'utente chiude il modale. */
  @Output() close = new EventEmitter<void>();

  /** Evento emesso per passare alla vista di registrazione. */
  @Output() openRegister = new EventEmitter<void>();

  /** Evento emesso per passare alla vista di richiesta reset password. */
  @Output() openPasswordResetRequest = new EventEmitter<void>();

  /** Identificativo inserito dall'utente (username o email). */
  identifier = '';
  /** Password inserita dall'utente. */
  password = '';

  constructor(public vm: LoginViewModel) {}

  /**
   * Gestisce il cambiamento degli input.
   * Resetta eventuali messaggi di errore visualizzati quando l'utente inizia a digitare nuovamente.
   */
  onInputChange() {
    if (this.vm.errorMessage()) {
      this.vm.clearError();
    }
  }

  /**
   * Gestisce il submit del form di login.
   * Invoca il metodo di login del ViewModel e chiude il modale in caso di successo.
   */
  async handleLogin() {
    const ok = await this.vm.login({
      identifier: this.identifier.trim(),
      password: this.password.trim()
    });

    if (ok) {
      this.close.emit();
    }
  }

}
