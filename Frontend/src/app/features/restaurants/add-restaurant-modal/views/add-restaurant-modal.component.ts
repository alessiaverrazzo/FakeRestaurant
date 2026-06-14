import { Component, EventEmitter, Output, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AddRestaurantModalViewModel } from '../viewmodels/add-restaurant-modal.viewmodel';
import { CreatedRestaurantEvent } from '../models/add-restaurant.model';

import { MapLocationPickerComponent } from '@shared/components/map-location-picker/views/map-location-picker.component';
import { RestaurantService } from '@core/services/restaurant.service';

/**
 * Componente per il modale di aggiunta ristorante.
 * Permette all'utente di inserire i dati di un nuovo ristorante (nome, descrizione, posizione, immagine).
 * Gestisce l'interazione con il ViewModel e il servizio di creazione.
 */
@Component({
  selector: 'app-add-restaurant-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MapLocationPickerComponent
  ],
  providers: [AddRestaurantModalViewModel],
  templateUrl: './add-restaurant-modal.component.html',
  styleUrls: ['./add-restaurant-modal.component.scss'],
})
export class AddRestaurantModalComponent {

  /** Evento emesso quando il modale viene chiuso (senza successo o dopo successo). */
  @Output() close = new EventEmitter<void>();

  /** Evento emesso quando un ristorante viene creato con successo. */
  @Output() save = new EventEmitter<CreatedRestaurantEvent>();

  public vm = inject(AddRestaurantModalViewModel);
  private restaurantService = inject(RestaurantService);

  /**
   * Gestisce la selezione della posizione sulla mappa.
   * Aggiorna le coordinate nel ViewModel.
   * @param ev Oggetto contenente latitudine e longitudine.
   */
  onLocationSelected(ev: { lat: number; lng: number }) {
    this.vm.setLocation(ev.lat, ev.lng);
  }

  /**
   * Gestisce la selezione di un file immagine dall'input file.
   * Legge il file, aggiorna il ViewModel e genera un'anteprima.
   * @param event L'evento di input (change).
   */
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.vm.setImageFile(null);
      this.vm.setImagePreview(null);
      return;
    }

    const file = input.files[0];
    this.vm.setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.vm.setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Rimuove l'immagine selezionata e la relativa anteprima.
   */
  removeImage() {
    this.vm.setImageFile(null);
    this.vm.setImagePreview(null);
  }

  /**
   * Gestisce l'invio del form.
   * Valida i dati, invoca il servizio di creazione e gestisce la risposta (successo/errore).
   * In caso di successo, emette l'evento save e chiude il modale dopo un breve ritardo.
   */
  onSubmit() {
    if (this.vm.form.invalid) {
      this.vm.form.markAllAsTouched();
      return;
    }

    this.vm.clearError();
    this.vm.setLoading(true);

    const payload = this.vm.buildPayload();

    this.restaurantService.create(payload).subscribe({
      next: (created) => {
        this.vm.setLoading(false);

        this.vm.setSuccess("Ristorante inserito con successo!");

        setTimeout(() => {
          this.save.emit({
            createdRestaurantId: created.id
          });

          this.close.emit();
        }, 1500);
      },
      error: (err) => {
        this.vm.setLoading(false);

        const backendMessage =
          err?.error?.message ||
          err?.message ||
          "Errore durante la creazione del ristorante.";

        this.vm.setError(backendMessage);
      }

    });
  }
}
