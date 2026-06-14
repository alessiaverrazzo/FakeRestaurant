import { Component, EventEmitter, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RegisterViewModel } from '../viewmodels/register.viewmodel';

/**
 * Componente per la vista di Registrazione.
 * Gestisce l'interazione utente per la creazione di un nuovo account e delega la logica al ViewModel.
 * Emette eventi per la navigazione verso il login o per la chiusura del modale.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  providers: [RegisterViewModel],
})
export class RegisterComponent {

  /** Evento emesso quando la registrazione ha successo o l'utente chiude il modale. */
  @Output() close = new EventEmitter<void>();

  /** Evento emesso per passare alla vista di login. */
  @Output() openLogin = new EventEmitter<void>();

  constructor(public vm: RegisterViewModel) {}

  /**
   * Gestisce il submit del form di registrazione.
   * Verifica la validità del form e invoca il metodo di registrazione del ViewModel.
   * Chiude il modale in caso di successo.
   */
  async handleRegister() {
    if (this.vm.form.invalid) {
      this.vm.form.markAllAsTouched();
      return;
    }

    const ok = await this.vm.register();

    if (ok) {
      this.close.emit();
    }
  }
}
