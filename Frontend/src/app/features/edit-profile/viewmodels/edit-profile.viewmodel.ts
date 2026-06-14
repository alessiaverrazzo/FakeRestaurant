import { Injectable, signal, inject } from '@angular/core';
import { EditProfileState, EditProfileData } from '../models/edit-profile.model';
import { UserService } from '@core/services/user.service';
import { Router } from '@angular/router';
import { AppState } from '@core/state/app.state';

/**
 * ViewModel per la gestione della modifica del profilo utente.
 * Gestisce lo stato del form, le validazioni, il caricamento dei dati e le operazioni CRUD (update, delete).
 */
@Injectable({ providedIn: 'root' })
export class EditProfileViewModel {

  /** Signal che mantiene lo stato completo della vista (campi, errori, loading, modali). */
  state = signal<EditProfileState>({
    username: '',
    icon_id: 1,

    newPassword: null,
    confirmPassword: null,

    loading: false,
    errors: [],
    success: null,

    showDeleteModal: false,
    deleteSuccess: false,
    deleteLoading: false,
  });

  private initialState!: { username: string; icon_id: number };

  private userService = inject(UserService);
  private appState = inject(AppState);
  private router = inject(Router);

  /**
   * Resetta i campi dinamici del form (password, messaggi).
   * Mantiene i dati utente caricati (username, icona).
   */
  reset() {
    this.state.update(s => ({
      ...s,
      newPassword: null,
      confirmPassword: null,
      errors: [],
      success: null,
      loading: false
    }));
  }

  /**
   * Carica i dati dell'utente corrente dal backend.
   * Inizializza lo stato del form e salva i valori iniziali per l'eventuale annullamento.
   */
  loadUser() {
    this.state.update(s => ({ ...s, loading: true, errors: [] }));

    this.userService.getMe().subscribe({
      next: (user) => {
        this.initialState = {
          username: user.username,
          icon_id: user.iconId
        };

        this.state.update(s => ({
          ...s,
          username: user.username,
          icon_id: user.iconId,
          loading: false
        }));
      },
      error: (err) => {
        const backendMessage =
          err?.error?.message ||
          err?.message ||
          "Si è verificato un errore. Riprova più tardi.";

        this.state.update(s => ({
          ...s,
          loading: false,
          errors: [backendMessage]
        }));
      }
    });
  }

  /**
   * Esegue la validazione dei campi del form (es. lunghezza password, corrispondenza).
   * Aggiorna la lista degli errori nello stato.
   */
  private validate() {
    const errors: string[] = [];
    const { newPassword, confirmPassword } = this.state();

    if (newPassword && newPassword.length < 8) {
      errors.push('La password deve contenere almeno 8 caratteri.');
    }

    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.push('Le password non coincidono.');
    }

    this.state.update(s => ({ ...s, errors }));
  }

  /**
   * Aggiorna un campo specifico dello stato e riesegue la validazione.
   * @param key Il nome del campo da aggiornare.
   * @param value Il nuovo valore.
   */
  updateField<K extends keyof EditProfileState>(key: K, value: EditProfileState[K]) {
    let cleanValue = value;

    if (key === 'username' && typeof value === 'string') {
      cleanValue = value.trim() as EditProfileState[K];
    }

    this.state.update(s => ({
      ...s,
      [key]: cleanValue,
      success: null
    }));

    this.validate();
  }

  /**
   * Invia le modifiche al backend.
   * Se l'operazione ha successo, aggiorna lo stato globale dell'app e reindirizza al profilo.
   */
  submit() {
    this.validate();
    if (this.state().errors.length > 0) return;

    this.state.update(s => ({ ...s, loading: true, success: null }));

    const { username, icon_id, newPassword } = this.state();

    const payload: EditProfileData = {
      username,
      icon_id,
      password: newPassword ?? undefined
    };

    this.userService.updateUser(payload).subscribe({
      next: (updatedUser) => {
        // Aggiorniamo AppState così la navbar e tutto il resto riflettono i nuovi dati
        this.appState.patchUser({
          username: updatedUser.username,
          iconId: updatedUser.iconId
        });

        this.state.update(s => ({
          ...s,
          loading: false,
          success: 'Modifiche salvate con successo!'
        }));

        setTimeout(() => this.router.navigate(['/profile']), 1200);
      },
      error: err => {
        const backendMessage =
          err?.backend?.message ||
          err?.message ||
          "Si è verificato un errore. Riprova più tardi.";

        this.state.update(s => ({
          ...s,
          loading: false,
          errors: [backendMessage]
        }));
      }
    });
  }

  /**
   * Annulla le modifiche non salvate, ripristinando i valori iniziali.
   */
  cancelChanges() {
    this.state.update(s => ({
      ...s,
      username: this.initialState.username,
      icon_id: this.initialState.icon_id,
      newPassword: null,
      confirmPassword: null,
      errors: [],
      success: null
    }));
  }

  /** Apre la modale di conferma eliminazione account. */
  openDeleteModal() {
    this.state.update(s => ({ ...s, showDeleteModal: true }));
  }

  /** Chiude la modale di conferma eliminazione account. */
  closeDeleteModal() {
    this.state.update(s => ({ ...s, showDeleteModal: false }));
  }

  /**
   * Conferma l'eliminazione dell'account.
   * Invia la richiesta, effettua il logout e reindirizza alla home page.
   */
  confirmDeleteAccount() {
    this.state.update(s => ({ ...s, deleteLoading: true }));

    this.userService.deleteUser().subscribe({
      next: () => {
        this.state.update(s => ({
          ...s,
          deleteSuccess: true,
          deleteLoading: false
        }));

        // Logout globale
        this.appState.reset();
        localStorage.removeItem('auth_token');

        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1200);
      },
      error: err => {
        const backendMessage =
          err?.error?.message ||
          err?.message ||
          "Errore durante l'eliminazione dell'account.";

        this.state.update(s => ({
          ...s,
          deleteLoading: false,
          errors: [backendMessage]
        }));
      }
    });
  }
}
