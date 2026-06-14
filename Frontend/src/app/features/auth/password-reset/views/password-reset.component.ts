import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PasswordResetViewModel } from '../viewmodels/password-reset.viewmodel';

/**
 * Componente per la vista di Reset Password.
 * Permette all'utente di inserire una nuova password utilizzando un token valido.
 * Gestisce la validazione del form e il reindirizzamento al login dopo il successo.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './password-reset.component.html',
})
export class PasswordResetComponent implements OnInit {

  /** Token di reset recuperato dall'URL. */
  token: string = '';
  /** Nuova password inserita dall'utente. */
  password = '';
  /** Conferma della nuova password. */
  confirmPassword = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public vm: PasswordResetViewModel
  ) {}

  /**
   * Inizializza il componente.
   * Recupera il token dai parametri della rotta e verifica se è presente.
   */
  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token.trim()) {
      this.vm.errorMessage.set('Link non valido.');
    }
  }

  /**
   * Gestisce il submit del form di reset.
   * Verifica che le password coincidano e invoca il ViewModel.
   * In caso di successo, reindirizza alla home page (aprendo il login) dopo 3 secondi.
   * @param form Il form Angular contenente i dati.
   */
  async handleSubmit(form: NgForm) {
    if (form.invalid) return;

    if (this.password !== this.confirmPassword) {
      this.vm.errorMessage.set('Le password non coincidono.');
      return;
    }

    const ok = await this.vm.resetPassword(this.token, this.password);

    if (ok) {
      setTimeout(() => {
        this.router.navigate(['/'], { state: { openLogin: true } });
      }, 3000);
    }
  }

  /**
   * Naviga manualmente alla pagina di login (Home con stato openLogin).
   */
  goToLogin() {
    this.router.navigate(['/'], { state: { openLogin: true } });
  }
}
