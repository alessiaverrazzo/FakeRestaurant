/**
 * Modello dati per la card di anteprima di un Ristorante.
 * Utilizzato nelle liste (Home, Ricerca, Profilo) per visualizzare le informazioni essenziali.
 */
export interface RestaurantCardModel {
  id: number;
  name: string;
  description: string;
  /** URL dell'immagine di copertina */
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  /** Numero totale di voti positivi. */
  upvotes: number;
  /** Numero totale di voti negativi. */
  downvotes: number;
}
