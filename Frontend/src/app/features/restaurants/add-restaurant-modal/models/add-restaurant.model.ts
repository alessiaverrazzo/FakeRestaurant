/**
 * Modello dati per la richiesta di creazione di un nuovo ristorante.
 * Contiene le informazioni inserite dall'utente nel form di aggiunta.
 */
export interface AddRestaurantRequest {
  /** Nome del ristorante. */
  name: string;
  /** Descrizione del ristorante. */
  description: string;
  /** Latitudine geografica. */
  latitude: number;
  /** Longitudine geografica. */
  longitude: number;
  /** File immagine opzionale caricato dall'utente. */
  imageFile: File | null;
}

/**
 * Evento emesso quando un ristorante viene creato con successo.
 * Utile per notificare il componente padre e aggiornare la lista o navigare.
 */
export interface CreatedRestaurantEvent {
  /** ID del ristorante appena creato. */
  createdRestaurantId: number;
}
