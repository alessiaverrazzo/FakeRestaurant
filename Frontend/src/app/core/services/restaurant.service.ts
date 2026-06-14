import { Injectable } from '@angular/core';
import { Observable, switchMap, map, throwError } from 'rxjs';
import { HttpService } from './http.service';
import { RestaurantCardModel } from '@shared/components/restaurant-card/models/restaurant-card.model';
import { RestaurantDetailModel } from '@features/restaurants/restaurant-detail/models/restaurant-detail.model';

/**
 * Servizio per la gestione dei Ristoranti.
 * Gestisce le operazioni CRUD, la ricerca (per nome e posizione), i voti e le statistiche (Top/Flop).
 * Include metodi di validazione e sanitizzazione dei dati in ingresso per garantire la sicurezza.
 */
@Injectable({
  providedIn: 'root',
})
export class RestaurantService {
  constructor(private http: HttpService) {}

  private readonly IMAGE_BASE_URL = 'http://localhost:3000/uploads/';

  /**
   * Valida un ID assicurandosi che sia un numero finito e positivo.
   * @param id L'ID da verificare.
   * @throws Error se l'ID non è valido.
   */
  private validateId(id: any): number {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error('Invalid ID');
    }
    return n;
  }

  /**
   * Sanitizza una stringa rimuovendo tag HTML potenzialmente pericolosi (prevenzione XSS).
   * @param text Il testo da pulire.
   * @param max Lunghezza massima consentita (default 2000).
   */
  private sanitizeText(text: string, max = 2000): string {
    if (!text) {
      return '';
    }
    let cleaned = text.trim().replace(/[<>]/g, '');
    return cleaned.slice(0, max);
  }

  /**
   * Sanitizza la query di ricerca permettendo solo caratteri alfanumerici e punteggiatura sicura.
   * @param q La stringa di ricerca.
   */
  private sanitizeQuery(q: string): string {
    if (!q) {
      return '';
    }
    let cleaned = q
      .trim()
      .replace(/[^0-9a-zA-ZÀ-ÖØ-öø-ÿ\s,'’-]/g, '')
      .slice(0, 100);
    return cleaned;
  }

  /**
   * Valida le coordinate geografiche.
   * @throws Error se latitudine o longitudine non sono numeri validi.
   */
  private validateCoords(lat: number, lng: number): { lat: number; lng: number } {
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      throw new Error('Invalid coordinates');
    }
    return { lat: la, lng: lo };
  }

  /**
   * Valida il raggio di ricerca, costringendolo tra 1km e 50km.
   */
  private validateRadius(km: number): number {
    const r = Number(km);
    if (!Number.isFinite(r)) {
      return 5;
    }
    return Math.min(Math.max(r, 1), 50);
  }

  /**
   * Recupera la lista di tutti i ristoranti.
   * @returns Observable di una lista di card ristorante.
   */
  getAll(): Observable<RestaurantCardModel[]> {
    return this.http.get<any[]>('restaurants').pipe(
      map(list => list.map(r => this.safeMapCard(r)))
    );
  }

  /**
   * Recupera i dettagli di un ristorante specifico tramite ID.
   * Effettua la validazione dell'ID prima della chiamata.
   * @param id L'ID del ristorante.
   * @returns Observable con i dettagli del ristorante.
   */
  getById(id: number): Observable<RestaurantDetailModel> {
    const safeId = this.validateId(id);

    return this.http.get<any>(`restaurants/${safeId}`).pipe(
      map(data => this.safeMapDetail(data))
    );
  }

  /**
   * Crea un nuovo ristorante.
   * Gestisce l'upload dell'immagine tramite FormData e sanitizza i campi testuali.
   * @param payload Oggetto contenente i dati del ristorante e il file immagine opzionale.
   */
  create(payload: {
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    imageFile?: File | null;
  }): Observable<RestaurantDetailModel> {
    const name = this.sanitizeText(payload.name, 255);
    const desc = this.sanitizeText(payload.description, 2000);
    const coords = this.validateCoords(payload.latitude, payload.longitude);

    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', desc);
    fd.append('latitude', coords.lat.toString());
    fd.append('longitude', coords.lng.toString());

    if (payload.imageFile instanceof File) {
      fd.append('image', payload.imageFile);
    }

    return this.http.post<any>('restaurants', fd).pipe(
      map(data => this.safeMapDetail(data))
    );
  }

  /**
   * Aggiorna i dati di un ristorante esistente.
   * @param id L'ID del ristorante da aggiornare.
   * @param data Oggetto con i campi da modificare (nome, descrizione).
   */
  update(id: number, data: { name?: string; description?: string }): Observable<RestaurantDetailModel> {
    const safeId = this.validateId(id);

    const payload: any = { id: safeId };
    if (data.name) {
      payload.name = this.sanitizeText(data.name, 255);
    }
    if (data.description) {
      payload.description = this.sanitizeText(data.description, 2000);
    }

    return this.http.put<any>(`restaurants/${safeId}`, payload).pipe(
      map(res => this.safeMapDetail(res))
    );
  }

  /**
   * Elimina un ristorante.
   * @param id L'ID del ristorante da eliminare.
   */
  delete(id: number): Observable<void> {
    const safeId = this.validateId(id);
    return this.http.delete<void>(`restaurants/${safeId}`);
  }

  /**
   * Recupera i ristoranti creati dall'utente attualmente loggato.
   * @returns Observable di una lista di card ristorante.
   */
  getMyRestaurants(): Observable<RestaurantCardModel[]> {
    return this.http.get<any[]>('restaurants/my-restaurants').pipe(
      map(list => list.map(r => this.safeMapCard(r)))
    );
  }

  /**
   * Cerca ristoranti per nome.
   * @param query La stringa di ricerca.
   * @returns Observable dei risultati corrispondenti.
   */
  searchByName(query: string): Observable<RestaurantCardModel[]> {
    const q = this.sanitizeQuery(query);

    return this.http
      .get<any[]>(`restaurants/search?query=${encodeURIComponent(q)}`)
      .pipe(map(list => list.map(r => this.safeMapCard(r))));
  }

  /**
   * Cerca ristoranti vicini a una posizione geografica.
   * @param lat Latitudine centrale.
   * @param lng Longitudine centrale.
   * @param radiusKm Raggio di ricerca in km.
   */
  searchByPosition(lat: number, lng: number, radiusKm: number): Observable<RestaurantCardModel[]> {
    const { lat: safeLat, lng: safeLng } = this.validateCoords(lat, lng);
    const radius = this.validateRadius(radiusKm);

    return this.http
      .get<any[]>(`restaurants/nearby?lat=${safeLat}&lng=${safeLng}&radius=${radius}`)
      .pipe(map(list => list.map(r => this.safeMapCard(r))));
  }

  /**
   * Recupera i ristoranti con i voti migliori della settimana (Top).
   */
  getTop(): Observable<RestaurantCardModel[]> {
    return this.http.get<any[]>('restaurants/top').pipe(
      map(list => list.map(r => this.safeMapCard(r)))
    );
  }

  /**
   * Recupera i ristoranti con i voti peggiori della settimana (Flop).
   */
  getFlop(): Observable<RestaurantCardModel[]> {
    return this.http.get<any[]>('restaurants/flop').pipe(
      map(list => list.map(r => this.safeMapCard(r)))
    );
  }

  /**
   * Invia un voto per un ristorante.
   * @param id ID del ristorante.
   * @param vote 1 per upvote, -1 per downvote.
   * @returns Observable con i dettagli aggiornati del ristorante.
   */
  voteRestaurant(id: number, vote: 1 | -1): Observable<RestaurantDetailModel> {
    const safeId = this.validateId(id);

    return this.http
      .post<any>('votesRestaurant', { restaurant_id: safeId, vote })
      .pipe(switchMap(() => this.getById(safeId)));
  }

  /**
   * Recupera il voto espresso dall'utente corrente su un ristorante.
   * @param id ID del ristorante.
   * @returns 1 (upvote), -1 (downvote) o 0 (nessun voto).
   */
  getUserVote(id: number): Observable<1 | -1 | 0> {
    const safeId = this.validateId(id);

    return this.http.get<any>(`votesRestaurant/user/${safeId}`).pipe(
      map(v => {
        if (!v || typeof v.vote !== 'number') return 0;
        return v.vote === 1 ? 1 : -1;
      })
    );
  }

  /**
   * Mappa i dati grezzi del backend nel modello `RestaurantCardModel`.
   * Gestisce valori nulli e costruisce l'URL completo dell'immagine.
   */
  private safeMapCard(data: any): RestaurantCardModel {
    return {
      id: Number(data.id) || 0,
      name: this.sanitizeText(data.name ?? '', 255),
      description: this.sanitizeText(data.description ?? '', 2000),
      imageUrl: data.image_url
        ? this.IMAGE_BASE_URL + data.image_url
        : null,
      upvotes: Number(data.upvotes ?? 0),
      downvotes: Number(data.downvotes ?? 0),
      latitude: Number(data.latitude) || 0,
      longitude: Number(data.longitude) || 0,
    };
  }

  /**
   * Mappa i dati grezzi del backend nel modello `RestaurantDetailModel`.
   * Include dettagli aggiuntivi come l'autore e la data di creazione.
   */
  private safeMapDetail(data: any): RestaurantDetailModel {
    return {
      id: Number(data.id) || 0,
      userId: Number(data.user_id) || 0,
      name: this.sanitizeText(data.name ?? '', 255),
      description: this.sanitizeText(data.description ?? '', 2000),
      imageUrl: data.image_url
        ? this.IMAGE_BASE_URL + data.image_url
        : null,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      createdAt: data.created_at ?? null,
      upvotes: Number(data.upvotes ?? 0),
      downvotes: Number(data.downvotes ?? 0),
      username: this.sanitizeText(data.username ?? '', 255),
      iconId: Number(data.icon_id ?? 0),
    };
  }
}
