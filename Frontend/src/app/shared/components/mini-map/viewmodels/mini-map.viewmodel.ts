import { Injectable } from '@angular/core';

/**
 * ViewModel per il componente MiniMap.
 * Gestisce le coordinate geografiche e il nome del ristorante da visualizzare nel tooltip.
 * Include logica di sanitizzazione per il nome.
 */
@Injectable()
export class MiniMapViewModel {
  /** Latitudine del punto da mostrare. */
  latitude!: number;
  /** Longitudine del punto da mostrare. */
  longitude!: number;
  /** Nome del ristorante per il tooltip. */
  restaurantName: string = '';

  /**
   * Sanitizza il nome del ristorante rimuovendo tag HTML e normalizzando gli spazi.
   * @param name Il nome grezzo.
   * @returns Il nome pulito.
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Imposta le coordinate e il nome del ristorante.
   * Converte gli input in numeri e gestisce eventuali valori non validi.
   * @param lat Latitudine.
   * @param lng Longitudine.
   * @param name Nome opzionale del ristorante.
   */
  setCoords(lat: any, lng: any, name?: string) {
    this.latitude = Number(lat);
    this.longitude = Number(lng);

    if (Number.isNaN(this.latitude) || Number.isNaN(this.longitude)) {
      console.warn("Coordinate MiniMap non numeriche:", lat, lng);
    }

    if (name) {
      this.restaurantName = this.sanitizeName(name);
    }
  }
}
