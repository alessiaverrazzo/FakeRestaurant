import { Request, Response } from 'express';
import asyncHandler from '../middlewares/asyncHandler';
import NotificationService from '../services/NotificationService';
import { NotificationDTO } from '../dtos/notification.dto';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import UserService from '../services/UserService';

/**
 * Controller per la gestione delle notifiche utente.
 * Espone endpoint per recuperare, leggere ed eliminare le notifiche.
 * Si occupa anche di trasformare i modelli di notifica in DTO arricchiti con dettagli utili per il frontend.
 */
export class NotificationController {

  /**
   * Recupera tutte le notifiche dell'utente autenticato.
   * Esegue una mappatura complessa per associare ogni notifica ai relativi ID di navigazione (recensione, ristorante, risposta).
   */
  static getAllByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const notifications = await NotificationService.getByUserId(userId);

    // Mappatura asincrona per arricchire i DTO con username dell'attore e ID corretti
    const dtos = await Promise.all(
      notifications.map(async (n) => {
        const actorUsername = await UserService.getUsernameById(n.actor_id);
        let reviewId: number | null = null;
        let replyId: number | null = null;

        // Determina l'ID del ristorante target (diretto o tramite recensione)
        const restaurantId =
          n.review?.restaurant_id ??   // se target è una review
          n.restaurant?.id ??          // se target è un ristorante
          null;

        // Logica specifica per tipo di notifica per impostare i link di navigazione
        switch (n.type) {

          // Caso: Nuova recensione (target_id è la recensione stessa)
          case "new_review":
            reviewId = n.target_id;
            replyId = null;
            break;

          // Caso: Risposta a una recensione (target_id è la risposta, serve anche l'ID del padre)
          case "reply":
            replyId = n.target_id;
            reviewId = n.review?.parent_review_id ?? null;
            break;

          // Caso: Voto su recensione (target_id è la recensione votata)
          case "upvote":
          case "downvote":
            if (n.target_type === "review") {
              reviewId = n.target_id;
              replyId = null;
            }
            break;

          default:
            break;
        }

        return new NotificationDTO({
          id: n.id,
          user_id: n.user_id,
          type: n.type,
          actor_id: n.actor_id,
          target_type: n.target_type,
          target_id: n.target_id,
          is_read: n.is_read,
          created_at: n.created_at!,
          actor_username: actorUsername ?? undefined,
          review_id: reviewId,
          reply_id: replyId,
          restaurant_id: restaurantId
        });
      })
    );

    res.status(200).json(dtos);
  });

  /**
   * Recupera solo le notifiche recenti (ultimi 7 giorni) dell'utente.
   * Utile per visualizzazioni rapide.
   * La logica di mappatura è identica a `getAllByUser`.
   */
  static getRecentByUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const notifications = await NotificationService.getRecentByUserId(userId);

    const dtos = await Promise.all(
      notifications.map(async (n) => {
        const actorUsername = await UserService.getUsernameById(n.actor_id);

        let reviewId: number | null = null;
        let replyId: number | null = null;

        // Calcolo restaurant_id (polimorfico)
        const restaurantId =
          n.review?.restaurant_id ??
          n.restaurant?.id ??
          null;

        // Gestione tipi di notifica per navigazione
        switch (n.type) {

          // Nuova recensione principale
          case "new_review":
            reviewId = n.target_id;
            replyId = null;
            break;

          // Risposta
          case "reply":
            replyId = n.target_id;
            reviewId = n.review?.parent_review_id ?? null;
            break;

          // Voti alla recensione
          case "upvote":
          case "downvote":
            if (n.target_type === "review") {
              reviewId = n.target_id;
              replyId = null;
            }
            break;

          default:
            break;
        }

        return new NotificationDTO({
          id: n.id,
          user_id: n.user_id,
          type: n.type,
          actor_id: n.actor_id,
          target_type: n.target_type,
          target_id: n.target_id,
          is_read: n.is_read,
          created_at: n.created_at!,
          actor_username: actorUsername ?? undefined,
          review_id: reviewId,
          reply_id: replyId,
          restaurant_id: restaurantId
        });
      })
    );

    res.status(200).json(dtos);
  });

  /**
   * Segna una specifica notifica come letta.
   * Verifica che l'utente sia il proprietario della notifica.
   */
  static markAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) throw new AppError("L'id della notifica deve essere un numero", 400);

    // Verifica esistenza e proprietario della notifica prima di aggiornare
    const notif = await NotificationService.getById(id);
    if (notif.user_id !== userId) throw new AppError("Non autorizzato", 403);

    await NotificationService.markAsRead(userId, id);

    res.status(200).json({ message: "Notifica segnata come letta" });
  });

  /**
   * Segna tutte le notifiche dell'utente come lette in un colpo solo.
   */
  static markAllAsRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    await NotificationService.markAllAsRead(userId);

    res.status(200).json({ message: "Tutte le notifiche sono segnate come lette" });
  });

  /**
   * Elimina una notifica specifica.
   * Verifica che l'utente sia il proprietario prima di cancellare.
   */
  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) throw new AppError("L'id della notifica deve essere un numero", 400);

    // Verifica esistenza e proprietario
    const notif = await NotificationService.getById(id);
    if (notif.user_id !== userId) throw new AppError("Non autorizzato", 403);

    await NotificationService.delete({ id, userId });

    res.status(204).send();
  });
}
