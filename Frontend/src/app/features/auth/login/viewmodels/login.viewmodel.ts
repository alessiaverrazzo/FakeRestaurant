import { Injectable, signal, computed } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { LoginRequest } from '../models/login.model';
import { firstValueFrom } from 'rxjs';

/**
 * ViewModel per la logica di business della pagina di Login.
 * Gestisce lo stato del form, il caricamento e gli errori, separando la logica dalla vista.
 */
@Injectable()
export class LoginViewModel {

  /** Signal privato per lo stato di caricamento. */
  private _loading = signal(false);
  /** Signal pubblico (read-only) che indica se è in corso un'operazione di login. */
  loading = computed(() => this._loading());

  /** Signal privato per il messaggio di errore. */
  private _errorMessage = signal<string | null>(null);
  /** Signal pubblico (read-only) che espone l'eventuale messaggio di errore. */
  errorMessage = computed(() => this._errorMessage());

  constructor(private auth: AuthService) {}

  /**
   * Resetta il messaggio di errore corrente.
   */
  clearError() {
    this._errorMessage.set(null);
  }

  /**
   * Imposta manualmente un messaggio di errore.
   * @param msg Il messaggio da visualizzare.
   */
  setError(msg: string) {
    this._errorMessage.set(msg);
  }

  /**
   * Esegue il tentativo di login.
   * Gestisce il loading state e cattura eventuali errori dal backend.
   * @param data I dati di login (identifier e password).
   * @returns Promise<boolean> true se il login ha successo, false altrimenti.
   */
  async login(data: LoginRequest): Promise<boolean> {
    this._loading.set(true);
    this._errorMessage.set(null);

    try {
      await firstValueFrom(
        this.auth.login(data.identifier, data.password)
      );
      return true;

    } catch (err: any) {
      const backendMessage =
        err?.error?.message ||
        err?.message ||
        "Errore sconosciuto";

      this._errorMessage.set(backendMessage);

      return false;

    } finally {
      this._loading.set(false);
    }
  }
}
