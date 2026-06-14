/**
 * DTO (Data Transfer Object) per l'esposizione dei dati di un ristorante.
 * Utilizzato per inviare al frontend le informazioni complete su un ristorante,
 * inclusi i dettagli del proprietario e il conteggio dei voti.
 */
export class RestaurantDTO {
  id: number;
  /** ID dell'utente proprietario del ristorante */
  user_id: number;
  name: string;
  description: string;
  /** URL relativo o assoluto dell'immagine del ristorante */
  image_url: string;
  /** Latitudine geografica per la mappa */
  latitude: number;
  /** Longitudine geografica per la mappa */
  longitude: number;
  created_at: Date;

  /** Numero totale di voti positivi ricevuti */
  upvotes?: number;
  /** Numero totale di voti negativi ricevuti */
  downvotes?: number;

  /** Username del proprietario (join con tabella utenti) */
  username?: string;
  /** ID dell'icona del proprietario */
  icon_id?: number;


  constructor(data: {
    id: number;
    user_id: number;
    name: string;
    description: string;
    image_url: string;
    latitude: number;
    longitude: number;
    created_at: Date;
    upvotes: number;
    downvotes: number;
    username?: string;
    icon_id?: number;
  }) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.description = data.description;
    this.image_url = data.image_url;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.created_at = data.created_at;
    this.upvotes = data.upvotes;
    this.downvotes = data.downvotes;
    this.username = data.username;
    this.icon_id = data.icon_id;
  }
}

/**
 * DTO per la creazione di un nuovo ristorante.
 * Contiene i dati essenziali richiesti dal form di creazione.
 */
export class CreateRestaurantDTO {
  name: string;
  description: string;
  /** URL dell'immagine caricata (opzionale) */
  image_url?: string;
  /** Latitudine selezionata sulla mappa */
  latitude: number;
  /** Longitudine selezionata sulla mappa */
  longitude: number;

  constructor(data: {
    name: string;
    description: string;
    image_url?: string;
    latitude: number;
    longitude: number;
  }) {
    this.name = data.name;
    this.description = data.description;
    this.image_url = data.image_url;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
  }
}


/**
 * DTO per l'aggiornamento dei dati di un ristorante esistente.
 * Permette di modificare solo nome e descrizione (immagine e coordinate sono immutabili in questo contesto).
 */
export class UpdateRestaurantDTO {
  id: number;
  /** Nuovo nome del ristorante (opzionale) */
  name?: string;
  /** Nuova descrizione del ristorante (opzionale) */
  description?: string;

  constructor(data: { id: number; name?: string; description?: string }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
  }
}
