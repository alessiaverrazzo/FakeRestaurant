import RestaurantRepository from '../repositories/RestaurantRepository';
import { Restaurant } from '../models/Restaurant';
import { AppError } from '../utils/AppError';
import fs from "fs";
import path from "path";

/**
 * Service per la gestione della logica di business relativa ai ristoranti.
 * Gestisce CRUD, validazioni, calcoli statistici (Wilson Score) e gestione file.
 */
class RestaurantService {
  /**
   * Crea un nuovo ristorante dopo aver sanitizzato gli input.
   * Rimuove tag HTML potenzialmente pericolosi da nome e descrizione.
   * @param restaurant L'istanza del ristorante da creare.
   */
  async create(restaurant: Restaurant): Promise<Restaurant> {
    // Sanitizzazione di base
    if (restaurant.name) {
      restaurant.name = restaurant.name
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 255);
    }

    if (restaurant.description) {
      restaurant.description = restaurant.description
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 2000);
    }

    return await RestaurantRepository.create(restaurant);
  }

  /**
   * Recupera un ristorante per ID, includendo i dati del proprietario.
   * @param id ID del ristorante.
   */
  async getById(id: number): Promise<Restaurant | null> {
    return await RestaurantRepository.findByIdWithUser(id);
  }

  /**
   * Recupera tutti i ristoranti presenti nel sistema.
   */
  async getAll(): Promise<Restaurant[]> {
    return await RestaurantRepository.findAll();
  }

  /**
   * Recupera tutti i ristoranti di proprietà di un utente specifico.
   * @param userId ID dell'utente.
   */
  async getByUserId(userId: number): Promise<Restaurant[]> {
    return await RestaurantRepository.findByUserId(userId);
  }

  /**
   * Aggiorna i dati di un ristorante esistente.
   * Effettua controlli di sicurezza:
   * 1. Verifica che il ristorante esista.
   * 2. Verifica che l'utente richiedente sia il proprietario.
   * 3. Sanitizza i campi testuali (nome, descrizione) per prevenire XSS.
   * @param data Oggetto contenente i dati da aggiornare.
   * @returns Il ristorante aggiornato.
   */
  async update(data: {
    id: number;
    userId: number;
    name?: string;
    description?: string;
    image_url?: string;
  }): Promise<Restaurant> {
    const restaurant = await RestaurantRepository.findById(data.id);
    if (!restaurant) throw new AppError("Restaurant not found", 404);

    // Owner check
    if (restaurant.user_id !== data.userId) {
      throw new AppError("Non autorizzato", 403);
    }

    // Nessun campo passato
    if (
      data.name === undefined &&
      data.description === undefined &&
      data.image_url === undefined
    ) {
      throw new AppError("At least one field required", 400);
    }

    // Sanitizzazione nome
    if (data.name !== undefined) {
      restaurant.name = data.name
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 255);
    }

    // Sanitizzazione descrizione
    if (data.description !== undefined) {
      restaurant.description = data.description
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 2000);
    }

    // Validazione immagine
    if (data.image_url !== undefined) {
      restaurant.image_url = data.image_url.trim().slice(0, 500);
    }

    const updated = await RestaurantRepository.update(restaurant);
    return updated!;
  }

  /**
   * Elimina un ristorante e la relativa immagine dal filesystem.
   * Verifica che l'utente richiedente sia il proprietario prima di procedere.
   * @param data Oggetto contenente ID ristorante e ID utente.
   */
  async delete(data: { restaurantId: number; userId: number }): Promise<void> {
    const restaurant = await RestaurantRepository.findById(data.restaurantId);
    if (!restaurant) throw new AppError("Ristorante non trovato", 404);

    if (restaurant.user_id !== data.userId) {
      throw new AppError("Non autorizzato", 403);
    }

    if (restaurant.image_url) {
      this.deleteImageFile(restaurant.image_url);
    }

    const success = await RestaurantRepository.delete(data.userId, data.restaurantId);
    if (!success) throw new AppError("Cancellazione fallita", 500);
  }

  /**
   * Calcola il Wilson Score Interval per ordinare i ristoranti in base alla qualità dei voti.
   * Bilancia la proporzione di voti positivi con il numero totale di voti.
   * @param upvotes Numero di voti positivi.
   * @param downvotes Numero di voti negativi.
   * @param z Livello di confidenza statistica (default 1.96 per 95%).
   */
  wilsonScore(upvotes: number, downvotes: number, z = 1.96): number {
    const n = upvotes + downvotes;
    if (n === 0) return 0;
    const p = upvotes / n;
    return (
      (p + (z * z) / (2 * n) -
        z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
      (1 + (z * z) / n)
    );
  }

  /**
   * Recupera i 5 ristoranti con il punteggio più alto in assoluto calcolato tramite Wilson Score.
   * Il punteggio tiene conto dei voti positivi e negativi per bilanciare popolarità e affidabilità.
   * @returns Array dei 5 ristoranti migliori ordinati dal punteggio più alto al più basso.
   */
  async getTopAllTime() {
    const restaurants = await RestaurantRepository.findAllWithVotes();

    const scored = restaurants.map((r: any) => ({
      ...r,
      wilson_score: this.wilsonScore(Number(r.upvotes), Number(r.downvotes)),
    }));

    return scored
      .sort((a, b) => b.wilson_score - a.wilson_score)
      .slice(0, 5);
  }

  /**
   * Recupera i 5 ristoranti con il punteggio più basso in assoluto calcolato tramite Wilson Score.
   * Il punteggio tiene conto dei voti positivi e negativi per bilanciare popolarità e affidabilità.
   * @returns Array dei 5 ristoranti peggiori ordinati dal punteggio più basso al più alto.
   */
  async getFlopAllTime() {
    const restaurants = await RestaurantRepository.findAllWithVotes();

    const scored = restaurants.map((r: any) => ({
      ...r,
      wilson_score: this.wilsonScore(Number(r.upvotes), Number(r.downvotes)),
    }));

    return scored
      .sort((a, b) => a.wilson_score - b.wilson_score)
      .slice(0, 5);
  }

  /**
   * Recupera un ristorante per ID includendo il conteggio dei voti.
   * @param id ID del ristorante.
   */
  async getByIdWithVotes(id: number): Promise<Restaurant> {
    const restaurant = await RestaurantRepository.findByIdWithVotes(id);
    if (!restaurant) throw new AppError("Ristorante non trovato", 404);
    return restaurant;
  }

  /**
   * Recupera tutti i ristoranti con il conteggio dei voti.
   */
  async getAllWithVotes(): Promise<Restaurant[]> {
    return await RestaurantRepository.findAllWithVotes();
  }

  /**
   * Cerca ristoranti per nome.
   * Sanitizza la stringa di ricerca per evitare problemi di performance o injection.
   * @param query Stringa di ricerca.
   */
  async searchByName(query: string) {
    if (!query) throw new AppError("Inserisci un termine di ricerca.", 400);

    query = query.trim().slice(0, 100);  // Protezione performance

    return await RestaurantRepository.searchByName(query);
  }

  /**
   * Cerca ristoranti entro un raggio geografico.
   * Valida le coordinate per assicurarsi che siano numeri reali e nel range corretto.
   * @param lat Latitudine.
   * @param lng Longitudine.
   * @param radiusKm Raggio in km.
   */
  async searchByPosition(lat: number, lng: number, radiusKm: number) {
    if (!isFinite(lat) || lat < -90 || lat > 90)
      throw new AppError("Latitudine non valida", 400);

    if (!isFinite(lng) || lng < -180 || lng > 180)
      throw new AppError("Longitudine non valida", 400);

    if (!isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50)
      throw new AppError("Raggio non valido", 400);

    return await RestaurantRepository.searchByPosition(lat, lng, radiusKm);
  }

  /**
   * Helper privato per eliminare fisicamente un file immagine dal server.
   * @param filename Nome del file da eliminare.
   */
  private deleteImageFile(filename: string | null) {
    if (!filename) return;

    const filePath = path.join(__dirname, "..", "..", "uploads", filename);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err: any) {
        throw new AppError("Errore durante la cancellazione dell'immagine.", 500);
      }
    }
  }

}

export default new RestaurantService();
