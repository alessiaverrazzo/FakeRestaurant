import { Injectable, signal, computed } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RegisterRequest } from '../models/register.model';
import { AuthService } from '@core/services/auth.service';
import { firstValueFrom } from 'rxjs';

/**
 * ViewModel per la logica di business della pagina di Registrazione.
 * Gestisce il Reactive Form, la selezione dell'icona profilo, la validazione
 * e la comunicazione con il servizio di autenticazione.
 */
@Injectable()
export class RegisterViewModel {

  private fb = new FormBuilder();

  constructor(private auth: AuthService) {}

  /** Signal privato per lo stato di caricamento. */
  private _loading = signal(false);
  /** Signal pubblico (read-only) che indica se è in corso la registrazione. */
  loading = computed(() => this._loading());

  /** Signal privato per il messaggio di errore globale. */
  private _errorMessage = signal<string | null>(null);
  /** Signal pubblico (read-only) che espone l'eventuale messaggio di errore. */
  errorMessage = computed(() => this._errorMessage());

  /** Lista di ID per le icone disponibili per la selezione. */
  readonly icons = Array.from({ length: 15 }, (_, i) => i + 1);

  /** Signal privato per l'icona selezionata. */
  private _selectedIcon = signal<number>(1);
  /** Signal pubblico (read-only) per l'icona selezionata. */
  selectedIcon = computed(() => this._selectedIcon());

  /** Reactive Form per la raccolta dei dati di registrazione. */
  form = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /**
   * Imposta l'icona del profilo selezionata.
   * @param i L'ID dell'icona.
   */
  selectIcon(i: number) {
    this._selectedIcon.set(i);
  }

  /**
   * Imposta manualmente un errore su un campo specifico del form.
   * Utile per mappare errori del backend (es. "Email già in uso") sui campi UI.
   * @param field Il nome del campo ('email' o 'username').
   * @param message Il messaggio di errore da mostrare.
   */
  setFieldError(field: 'email' | 'username', message: string) {
    const control = this.form.get(field);
    if (control) {
      control.setErrors({ custom: message });
      control.markAsTouched();
    }
  }

  /**
   * Restituisce il messaggio di errore leggibile per un dato controllo.
   * @param controlName Il nome del controllo nel form.
   * @returns Il messaggio di errore o null se valido.
   */
  getErrorMessage(controlName: string): string | null {
    const ctrl = this.form.get(controlName);
    if (!ctrl || !ctrl.errors) return null;

    if (ctrl.errors['required']) return 'Campo obbligatorio';
    if (ctrl.errors['email']) return 'Inserisci un’email valida';
    if (ctrl.errors['minlength']) return 'La password deve contenere almeno 8 caratteri';
    if (ctrl.errors['custom']) return ctrl.errors['custom'];

    return null;
  }

  /**
   * Verifica se mostrare l'errore per un campo (deve essere invalido e "touched").
   * @param controlName Il nome del controllo.
   */
  showError(controlName: string): boolean {
    const ctrl = this.form.get(controlName);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  /** Resetta il messaggio di errore globale. */
  clearError() {
    this._errorMessage.set(null);
  }

  /** Imposta un messaggio di errore globale. */
  setError(msg: string) {
    this._errorMessage.set(msg);
  }

  /** Imposta lo stato di caricamento. */
  setLoading(value: boolean) {
    this._loading.set(value);
  }

  /**
   * Costruisce il payload per la richiesta di registrazione.
   * Estrae i valori dal form e dal signal dell'icona.
   *
   * Nota: Utilizza l'operatore non-null assertion (!) perché si presume
   * che il metodo venga chiamato solo se il form è valido.
   * @returns L'oggetto RegisterRequest.
   */
  buildPayload(): RegisterRequest {
    return {
      username: this.form.value.username!,
      email: this.form.value.email!,
      password: this.form.value.password!,
      icon_id: this.selectedIcon(),
    };
  }

  /**
   * Esegue la registrazione dell'utente.
   * Gestisce il loading, la chiamata al servizio e il mapping degli errori del backend (es. duplicati).
   * @returns Promise<boolean> true se la registrazione ha successo, false altrimenti.
   */
  async register(): Promise<boolean> {
    this.setLoading(true);
    this.clearError();

    const data = this.buildPayload();

    try {
      await firstValueFrom(
        this.auth.register(data.username, data.email, data.password, data.icon_id)
      );
      return true;

    } catch (err: any) {
      const message =
        err?.error?.message ||     // messaggio backend
        err?.message ||            // fallback HttpErrorResponse
        'Registrazione non riuscita'; // fallback finale

      // Tenta di mappare l'errore del backend su un campo specifico del form
      const msgLower = message.toLowerCase();

      if (msgLower.includes('email')) {
        this.setFieldError('email', 'Email già esistente');
      }
      else if (msgLower.includes('username')) {
        this.setFieldError('username', 'Username già esistente');
      }
      else {
        this.setError(message);
      }

      return false;

    } finally {
      this.setLoading(false);
    }
  }
}
