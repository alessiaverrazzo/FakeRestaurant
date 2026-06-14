/**
 * Modello per rappresentare una posizione geografica sulla mappa.
 * Utilizzato per lo scambio di coordinate tra componenti (es. picker e form).
 */
export interface MapLocation {
  /** Latitudine geografica. */
  lat: number;
  /** Longitudine geografica. */
  lng: number;
}
