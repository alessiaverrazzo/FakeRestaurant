import { Request, Response } from 'express';
import asyncHandler from '../middlewares/asyncHandler';
import RestaurantService from '../services/RestaurantService';
import { RestaurantDTO, CreateRestaurantDTO, UpdateRestaurantDTO } from '../dtos/restaurant.dto';
import { Restaurant } from '../models/Restaurant';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import VoteRestaurantService from '../services/VoteRestaurantService';

/**
 * Controller per la gestione dei ristoranti.
 * Espone endpoint per CRUD, ricerche (nome, posizione) e classifiche (top/flop).
 */
export class RestaurantController {

  /**
   * Gestisce la creazione di un nuovo ristorante.
   * Recupera l'ID utente dal token, gestisce l'upload dell'immagine (se presente)
   * e valida i dati di input prima di chiamare il servizio.
   */
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const body: any = req.body;

    const image = req.file ? (req.file as any).savedFilename : null;

    // Validazioni minime
    if (!body.name || typeof body.name !== "string")
      throw new AppError("Il nome é obbligatorio", 400);

    if (!body.description || typeof body.description !== "string")
      throw new AppError("La descrizione é obbligatoria", 400);

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      throw new AppError("Latitudine e longitudine devono essere numeri", 400);
    }

    // Costruzione Model
    const restaurant = Restaurant.build({
      user_id: userId,
      name: body.name,
      description: body.description,
      image_url: image,
      latitude,
      longitude,
    });

    const newRestaurant = await RestaurantService.create(restaurant);

    const { upvotes, downvotes } = await VoteRestaurantService.getVotesCount(newRestaurant.id);

    res.status(201).json(
      new RestaurantDTO({
        id: newRestaurant.id,
        user_id: newRestaurant.user_id,
        name: newRestaurant.name,
        description: newRestaurant.description,
        image_url: newRestaurant.image_url,
        latitude: newRestaurant.latitude,
        longitude: newRestaurant.longitude,
        created_at: newRestaurant.created_at,
        upvotes,
        downvotes,
      })
    );
  });

  /**
   * Recupera i dettagli di un singolo ristorante tramite ID.
   * Include il conteggio aggiornato dei voti e i dati del proprietario.
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const restaurantId = parseInt(req.params.id, 10);
    if (isNaN(restaurantId)) throw new AppError("Id ristorante non valido", 400);

    const restaurant = await RestaurantService.getById(restaurantId);
    if (!restaurant) throw new AppError("Ristorante non trovato", 404);

    const { upvotes, downvotes } = await VoteRestaurantService.getVotesCount(restaurant.id);

    const dto = new RestaurantDTO({
      id: restaurant.id,
      user_id: restaurant.user_id,
      name: restaurant.name,
      description: restaurant.description,
      image_url: restaurant.image_url,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      created_at: restaurant.created_at,
      upvotes,
      downvotes,
      username: restaurant.owner?.username,
      icon_id: restaurant.owner?.icon_id,
    });

    res.status(200).json(dto);
  });

  /**
   * Recupera la lista completa dei ristoranti presenti nel sistema.
   * Per ogni ristorante viene calcolato il conteggio dei voti.
   */
  static getAll = asyncHandler(async (_req: Request, res: Response) => {
    const restaurants = await RestaurantService.getAll();
    let dtoList: RestaurantDTO[] = [];
    if (restaurants) {
      dtoList = await Promise.all(
        restaurants.map(async (r) => {
          const { upvotes, downvotes } = await VoteRestaurantService.getVotesCount(r.id);
          return new RestaurantDTO({
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            description: r.description,
            image_url: r.image_url,
            latitude: r.latitude,
            longitude: r.longitude,
            created_at: r.created_at,
            upvotes,
            downvotes,
          });
        })
      );
    }
    res.status(200).json(dtoList);
  });

  /**
   * Aggiorna i dati di un ristorante esistente.
   * Verifica che l'utente sia il proprietario e gestisce l'aggiornamento parziale dei campi.
   */
  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const restaurantId = parseInt(req.params.id, 10);
    const body: UpdateRestaurantDTO = req.body;
    const image = req.file ? (req.file as any).savedFilename : undefined;

    if (isNaN(restaurantId)) throw new AppError("L'id del ristorante deve essere un numero", 400);

    // Recupera ristorante
    const restaurant = await RestaurantService.getById(restaurantId);
    if (!restaurant) throw new AppError("Ristorante non trovato", 404);

    // Owner check
    if (restaurant.user_id !== userId)
      throw new AppError("Non autorizzato", 403);

    // Validazioni minime
    if (
      body.name === undefined &&
      body.description === undefined &&
      image === undefined
    ) {
      throw new AppError("Almeno un campo richiesto", 400);
    }

    // Costruzione Model
    const updated = await RestaurantService.update({
      id: restaurantId,
      name: body.name,
      description: body.description,
      image_url: image,
      userId,
    });

    const { upvotes, downvotes } = await VoteRestaurantService.getVotesCount(updated.id);

    res.status(200).json(
      new RestaurantDTO({
        id: updated.id,
        user_id: updated.user_id,
        name: updated.name,
        description: updated.description,
        image_url: updated.image_url,
        latitude: updated.latitude,
        longitude: updated.longitude,
        created_at: updated.created_at,
        upvotes,
        downvotes,
      })
    );
  });

  /**
   * Elimina un ristorante dal sistema.
   * Richiede che l'utente sia il proprietario del ristorante.
   */
  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const restaurantId = parseInt(req.params.id, 10);

    if (isNaN(restaurantId)) throw new AppError("L'id del ristorante deve essere un numero", 400);

    const restaurant = await RestaurantService.getById(restaurantId);
    if (!restaurant) throw new AppError("Ristorante non trovato", 404);

    if (restaurant.user_id !== userId)
      throw new AppError("Non autorizzato", 403);

    await RestaurantService.delete({ restaurantId, userId });
    res.status(204).send();
  });

  /**
   * Recupera tutti i ristoranti creati dall'utente attualmente loggato.
   */
  static getAllByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const restaurants = await RestaurantService.getByUserId(userId);
    let dtos: RestaurantDTO[] = [];
    if (restaurants) {
      dtos = await Promise.all(
        restaurants.map(async (r) => {
          const { upvotes, downvotes } = await VoteRestaurantService.getVotesCount(r.id);
          return new RestaurantDTO({
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            description: r.description,
            image_url: r.image_url,
            latitude: r.latitude,
            longitude: r.longitude,
            created_at: r.created_at,
            upvotes,
            downvotes,
          });
        })
      );
    }
    res.status(200).json(dtos);
  });

  /**
   * Restituisce i 5 ristoranti migliori di sempre (Wilson score).
   */
  static getTopAllTime = asyncHandler(async (_req: Request, res: Response) => {
    const topRestaurants = await RestaurantService.getTopAllTime();

    const dtos = topRestaurants.map(
      (r) =>
        new RestaurantDTO({
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          description: r.description,
          image_url: r.image_url,
          latitude: r.latitude,
          longitude: r.longitude,
          created_at: r.created_at,
          upvotes: r.upvotes,
          downvotes: r.downvotes,
        })
    );

    res.status(200).json(dtos);
  });

  /**
   * Restituisce i 5 ristoranti peggiori di sempre (Wilson score).
   */
  static getFlopAllTime = asyncHandler(async (_req: Request, res: Response) => {
    const flopRestaurants = await RestaurantService.getFlopAllTime();

    const dtos = flopRestaurants.map(
      (r) =>
        new RestaurantDTO({
          id: r.id,
          user_id: r.user_id,
          name: r.name,
          description: r.description,
          image_url: r.image_url,
          latitude: r.latitude,
          longitude: r.longitude,
          created_at: r.created_at,
          upvotes: r.upvotes,
          downvotes: r.downvotes,
        })
    );

    res.status(200).json(dtos);
  });

  /**
   * Esegue una ricerca testuale sui ristoranti basata sul nome.
   */
  static searchByName = asyncHandler(async (req: Request, res: Response) => {
    const rawQuery = (req.query.query as string | undefined)?.trim();
    if (!rawQuery) throw new AppError("Il parametro di ricerca 'query' è obbligatorio.", 400);

    const restaurants = await RestaurantService.searchByName(rawQuery);
    let dtos: RestaurantDTO[] = [];
    if (restaurants) {
      dtos = (restaurants as any[]).map(
        (r) =>
          new RestaurantDTO({
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            description: r.description,
            image_url: r.image_url,
            latitude: r.latitude,
            longitude: r.longitude,
            created_at: r.created_at,
            upvotes: Number(r.upvotes ?? 0),
            downvotes: Number(r.downvotes ?? 0),
          })
      );
    }
    res.status(200).json(dtos);
  });

  /**
   * Esegue una ricerca geografica per trovare ristoranti entro un certo raggio da coordinate specifiche.
   */
  static searchByPosition = asyncHandler(async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusParam = req.query.radius ?? req.query.radiusKm ?? 5;
    const radiusKm = Number(radiusParam);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new AppError("I parametri di ricerca 'lat' e 'lng' devono essere numeri.", 400);
    }
    if (Number.isNaN(radiusKm) || radiusKm <= 0) {
      throw new AppError("Il parametro di ricerca 'raggio' deve essere un numero positivo.", 400);
    }

    const restaurants = await RestaurantService.searchByPosition(lat, lng, radiusKm);
    let dtos: RestaurantDTO[] = [];
    if (restaurants) {
      dtos = (restaurants as any[])?.map(
        (r) =>
          new RestaurantDTO({
            id: r.id,
            user_id: r.user_id,
            name: r.name,
            description: r.description,
            image_url: r.image_url,
            latitude: r.latitude,
            longitude: r.longitude,
            created_at: r.created_at,
            upvotes: Number(r.upvotes ?? 0),
            downvotes: Number(r.downvotes ?? 0),
          })
      );
    }
    res.status(200).json(dtos);
  });
}
