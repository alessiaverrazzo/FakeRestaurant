/**
 * Modello di dettaglio per un Ristorante.
 * Contiene tutte le informazioni necessarie per visualizzare la pagina di dettaglio,
 * inclusi i dati del proprietario (username, icona) e le statistiche.
 */
export interface RestaurantDetailModel {
  id: number;
  /** ID dell'utente proprietario del ristorante. */
  userId?: number;
  name: string;
  description: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  upvotes: number;
  downvotes: number;
  createdAt: string;

  /** Username del proprietario */
  username?: string | null;
  /** ID dell'icona del proprietario. */
  iconId?: number | null;
}
