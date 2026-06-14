import { Injectable, signal } from '@angular/core';
import { MapLocation } from '../models/map-location.model';

/**
 * ViewModel per il componente di selezione posizione su mappa.
 * Gestisce lo stato delle coordinate selezionate e del raggio di ricerca.
 */
@Injectable()
export class MapLocationPickerViewModel {
  /** Signal che contiene la posizione geografica selezionata (o null). */
  location = signal<MapLocation | null>(null);

  /** Signal che contiene il raggio di ricerca in km (default 5). */
  radiusKm = signal<number>(5);

  /**
   * Imposta le nuove coordinate selezionate.
   * @param lat Latitudine.
   * @param lng Longitudine.
   */
  setLocation(lat: number, lng: number) {
    this.location.set({ lat, lng });
  }

  /**
   * Imposta il raggio di ricerca.
   * @param km Raggio in chilometri.
   */
  setRadius(km: number) {
    this.radiusKm.set(km);
  }
}
