/**
 * Modello di configurazione per il componente MiniMap.
 * Definisce le coordinate, lo zoom e le dimensioni della mappa statica/interattiva.
 */
export interface MiniMapInput {
  /** Latitudine del punto centrale. */
  latitude: number;
  /** Longitudine del punto centrale. */
  longitude: number;
  /** Livello di zoom iniziale */
  zoom?: number;
  /** Altezza del contenitore mappa (es. '300px'). */
  height?: string;
  /** Larghezza del contenitore mappa (es. '100%'). */
  width?: string;
  /** Nome del ristorante da mostrare nel tooltip del marker */
  restaurantName?: string;
}
