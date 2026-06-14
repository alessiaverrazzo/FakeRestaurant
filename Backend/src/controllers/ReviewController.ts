import { Request, Response } from 'express';
import asyncHandler from '../middlewares/asyncHandler';
import ReviewService from '../services/ReviewService';
import { ReviewDTO, CreateReviewDTO, UpdateReviewDTO } from '../dtos/review.dto';
import { AppError } from '../utils/AppError';
import Review from '../models/Review';
import { AuthRequest } from '../middlewares/authMiddleware';
import NotificationService from '../services/NotificationService';
import { notificationSocketService } from '../services/NotificationSocketService';

/**
 * Controller per la gestione delle recensioni.
 * Espone endpoint per creare, leggere, aggiornare ed eliminare recensioni.
 * Gestisce anche le notifiche in tempo reale quando viene creata una nuova recensione.
 */
export class ReviewController {

  /**
   * Crea una nuova recensione o una risposta a una recensione esistente.
   * Gestisce la validazione dell'input, la creazione tramite service e l'invio di notifiche push.
   */
  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const body: CreateReviewDTO = req.body;

    if (!body.content || typeof body.content !== "string")
      throw new AppError("La recensione non può essere vuota", 400);

    if (!body.restaurant_id)
      throw new AppError("L'id del ristorante é obbligatorio", 400);

    // Costruzione Model
    const review = Review.build({
      user_id: userId,
      restaurant_id: Number(body.restaurant_id),
      content: body.content,
      parent_review_id: body.parent_review_id ? Number(body.parent_review_id) : null,
    });

    const newReview = await ReviewService.create(review);

    // Notifiche push real-time
    const notifications = await NotificationService.getLastByActor(userId);

    for (const notif of notifications) {
      notificationSocketService.sendToUser(notif.user_id, notif);
    }

    const fullReview = await ReviewService.getById(newReview.id);

    res.status(201).json(new ReviewDTO(fullReview!));
  });

  /**
   * Recupera una singola recensione tramite ID.
   * Restituisce l'intero albero delle risposte (thread) associato alla recensione.
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const reviewId = Number(req.params.id);
    if (isNaN(reviewId)) throw new AppError("L'id della recensione deve essere un numero", 400);

    const reviewTree = await ReviewService.getTreeById(reviewId);
    if (!reviewTree) throw new AppError("Recensione non trovata", 404);

    res.status(200).json(new ReviewDTO(reviewTree));
  });

  /**
   * Recupera tutte le recensioni scritte dall'utente attualmente loggato.
   */
  static getAllByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const reviews = await ReviewService.getByUserId(userId);

    let dtos: ReviewDTO[] = [];
    if (reviews) {
      dtos = reviews.map(r => new ReviewDTO(r));
    }
    res.status(200).json(dtos);
  });

  /**
   * Recupera tutte le recensioni di un ristorante specifico.
   * Supporta l'ordinamento (BEST, NEWEST, OLDEST) e restituisce una struttura ad albero.
   */
  static getAllByRestaurant = asyncHandler(async (req: Request, res: Response) => {
    const restaurantId = Number(req.params.restaurantId);
    if (isNaN(restaurantId)) throw new AppError("L'id del ristorante deve essere un numero", 400);

    const order = (req.query.order as 'BEST' | 'NEWEST' | 'OLDEST') || 'BEST';

    const tree = await ReviewService.getTopLevelTreeByRestaurantId(restaurantId, order);
    const dtos = tree.map(r => new ReviewDTO(r));

    res.status(200).json(dtos);
  });

  /**
   * Aggiorna il contenuto di una recensione esistente.
   * Verifica che l'utente sia l'autore della recensione.
   */
  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const reviewId = Number(req.params.id);
    const body: UpdateReviewDTO = req.body;

    if (isNaN(reviewId)) throw new AppError("L'id della recensione deve essere un numero", 400);
    if (!body.content || typeof body.content !== "string")
      throw new AppError("La recensione non può essere vuota", 400);

    // Costruzione Model
    const updatedReview = await ReviewService.update({
      id: reviewId,
      content: body.content,
      userId,
    });

    const reviewTree = await ReviewService.getTreeById(updatedReview.id);

    res.status(200).json(new ReviewDTO(reviewTree!));
  });

  /**
   * Elimina una recensione dal sistema.
   * Richiede che l'utente sia l'autore della recensione.
   */
  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const reviewId = Number(req.params.id);

    if (isNaN(reviewId)) throw new AppError("L'id della recensione deve essere un numero", 400);

    await ReviewService.delete({ reviewId, userId });

    res.status(204).send();
  });

  /**
   * Restituisce le 5 recensioni migliori di sempre (Wilson score).
   */
  static getTopAllTime = asyncHandler(async (_req: Request, res: Response) => {
    const topReviews = await ReviewService.getTopAllTime();

    let dtos: ReviewDTO[] = [];
    if (topReviews) {
      dtos = topReviews.map(
        r =>
          new ReviewDTO({
            id: r.id,
            user_id: r.user_id,
            restaurant_id: r.restaurant_id,
            restaurant_name: r.restaurant_name,
            content: r.content,
            created_at: r.created_at,
            updated_at: r.updated_at,
            upvotes: r.upvotes,
            downvotes: r.downvotes,
            replies: [],
          })
      );
    }

    res.status(200).json(dtos);
  });
}
