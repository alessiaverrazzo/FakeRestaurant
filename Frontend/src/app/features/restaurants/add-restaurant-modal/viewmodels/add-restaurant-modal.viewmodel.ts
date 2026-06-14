import { Injectable, signal, computed } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AddRestaurantRequest } from '../models/add-restaurant.model';

/**
 * ViewModel per il modale di aggiunta ristorante.
 * Gestisce lo stato del form, l'anteprima dell'immagine, la validazione
 * e la preparazione del payload per la creazione.
 */
@Injectable()
export class AddRestaurantModalViewModel {

  private fb = new FormBuilder();

  /** Signal privato per lo stato di caricamento. */
  private _loading = signal(false);
  /** Signal pubblico (read-only) per lo stato di caricamento. */
  loading = computed(() => this._loading());

  /** Signal privato per il messaggio di errore. */
  private _errorMessage = signal<string | null>(null);
  /** Signal pubblico (read-only) per il messaggio di errore. */
  errorMessage = computed(() => this._errorMessage());

  /** Signal privato per l'URL di anteprima dell'immagine caricata. */
  private _imagePreview = signal<string | null>(null);
  /** Signal pubblico (read-only) per l'anteprima immagine. */
  imagePreview = computed(() => this._imagePreview());

  /** Signal privato per il file immagine effettivo. */
  private _imageFile = signal<File | null>(null);
  /** Signal pubblico (read-only) per il file immagine. */
  imageFile = computed(() => this._imageFile());

  /** Signal privato per il messaggio di successo. */
  private _successMessage = signal<string | null>(null);
  /** Signal pubblico (read-only) per il messaggio di successo. */
  successMessage = computed(() => this._successMessage());

  /** Reactive Form per i dati del ristorante. */
  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    latitude: [null as number | null, [Validators.required]],
    longitude: [null as number | null, [Validators.required]],
  });

  /**
   * Imposta il file immagine selezionato dall'utente.
   * @param file Il file immagine.
   */
  setImageFile(file: File | null) {
    this._imageFile.set(file);
  }

  /**
   * Imposta l'URL per l'anteprima dell'immagine.
   * @param url L'URL (spesso un data URL base64).
   */
  setImagePreview(url: string | null) {
    this._imagePreview.set(url);
  }

  /**
   * Imposta le coordinate geografiche nel form.
   * @param lat Latitudine.
   * @param lng Longitudine.
   */
  setLocation(lat: number, lng: number) {
    this.form.patchValue({
      latitude: lat,
      longitude: lng,
    });
  }

  /** Imposta un messaggio di successo. */
  setSuccess(msg: string) {
    this._successMessage.set(msg);
  }

  /** Resetta il messaggio di successo. */
  clearSuccess() {
    this._successMessage.set(null);
  }

  /** Resetta il messaggio di errore. */
  clearError() {
    this._errorMessage.set(null);
  }

  /** Imposta un messaggio di errore. */
  setError(msg: string) {
    this._errorMessage.set(msg);
  }

  /** Imposta lo stato di caricamento. */
  setLoading(value: boolean) {
    this._loading.set(value);
  }

  /**
   * Restituisce il messaggio di errore per un controllo specifico.
   * @param control Il nome del controllo nel form.
   */
  getErrorMessage(control: string): string | null {
    const ctrl = this.form.get(control);
    if (!ctrl || !ctrl.errors) return null;

    if (ctrl.errors['required']) return 'Campo obbligatorio';
    if (ctrl.errors['maxlength']) return 'Hai superato il limite di caratteri';

    return null;
  }

  /**
   * Verifica se mostrare l'errore per un controllo (invalido e touched).
   * @param control Il nome del controllo.
   */
  showError(control: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  /**
   * Costruisce il payload per la richiesta di creazione.
   * Assume che il form sia valido (i campi required non nulli).
   */
  buildPayload(): AddRestaurantRequest {
    return {
      name: (this.form.value.name ?? '').trim(),
      description: (this.form.value.description ?? '').trim(),
      latitude: this.form.value.latitude!,
      longitude: this.form.value.longitude!,
      imageFile: this.imageFile(),
    };
  }
}
