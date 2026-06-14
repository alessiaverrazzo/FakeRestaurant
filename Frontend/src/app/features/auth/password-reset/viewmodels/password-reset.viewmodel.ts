import { Injectable, signal } from '@angular/core';
import { HttpService } from '@core/services/http.service';
import { firstValueFrom } from 'rxjs';

/**
 * ViewModel per la gestione del reset della password.
 * Gestisce lo stato della richiesta (loading, success, error) e comunica con il backend.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetViewModel {

  /** Signal per lo stato di caricamento. */
  loading = signal(false);
  /** Signal per il messaggio di errore. */
  errorMessage = signal<string | null>(null);
  /** Signal per il messaggio di successo. */
  successMessage = signal<string | null>(null);

  constructor(private http: HttpService) {}

  /**
   * Resetta lo stato del ViewModel (loading e messaggi).
   */
  clearState() {
    this.loading.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  /**
   * Invia la richiesta di reset della password al backend.
   * @param token Il token di reset ricevuto via email.
   * @param password La nuova password scelta dall'utente.
   * @returns Promise<boolean> true se l'operazione ha successo, false altrimenti.
   */
  async resetPassword(token: string, password: string): Promise<boolean> {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await firstValueFrom(
        this.http.post('users/password-reset/reset', { token, password })
      );

      this.successMessage.set('✓ Password aggiornata con successo! 🎉');
      return true;

    } catch (err: any) {
      const backendMessage =
        err?.error?.message ||
        err?.message ||
        "Si è verificato un errore. Riprova più tardi.";

      this.errorMessage.set(backendMessage);
      return false;

    } finally {
      this.loading.set(false);
    }
  }
}
