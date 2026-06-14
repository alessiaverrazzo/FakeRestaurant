import { Injectable, signal } from '@angular/core';
import { HttpService } from '@core/services/http.service';
import { firstValueFrom } from 'rxjs';

/**
 * ViewModel per la gestione della richiesta di reset password.
 * Gestisce l'invio dell'email di recupero, monitorando lo stato di caricamento e gli esiti.
 */
@Injectable({ providedIn: 'root' })
export class PasswordResetRequestViewModel {

  /** Signal per lo stato di caricamento. */
  loading = signal(false);
  /** Signal per il messaggio di errore. */
  errorMessage = signal<string | null>(null);
  /** Signal per il messaggio di successo. */
  successMessage = signal<string | null>(null);

  constructor(private http: HttpService) {}

  /**
   * Invia una richiesta di reset password per l'email specificata.
   * @param email L'indirizzo email dell'utente.
   * @returns Promise<boolean> true se la richiesta è stata inviata correttamente, false altrimenti.
   */
  async requestReset(email: string): Promise<boolean> {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loading.set(true);

    try {
      await firstValueFrom(
        this.http.post('users/password-reset', { email })
      );

      this.successMessage.set(
        'Se l’utente esiste, riceverai una mail per reimpostare la password.'
      );

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

  /**
   * Resetta lo stato del ViewModel (loading e messaggi).
   */
  resetState() {
    this.loading.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
