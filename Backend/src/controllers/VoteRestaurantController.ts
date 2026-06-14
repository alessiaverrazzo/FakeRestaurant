import { Request, Response } from 'express';
import asyncHandler from '../middlewares/asyncHandler';
import VoteRestaurantService from '../services/VoteRestaurantService';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { CreateVoteRestaurantDTO, VoteRestaurantDTO } from '../dtos/voteRestaurant.dto';
import NotificationService from '../services/NotificationService';
import { notificationSocketService } from '../services/NotificationSocketService';

/**
 * Controller per la gestione dei voti ai ristoranti.
 * Espone endpoint per votare (toggle) e recuperare il voto dell'utente corrente.
 */
export class VoteRestaurantController {

  /**
   * Gestisce l'azione di voto su un ristorante.
   * Se il voto esiste già, lo aggiorna o lo rimuove (toggle).
   * Invia notifiche in tempo reale agli interessati (es. proprietario del ristorante).
   */
  static vote = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const body: CreateVoteRestaurantDTO = req.body;

    if (!body.restaurant_id) throw new AppError("Il ristorante é obbligatorio", 400);

    // Chiama il service passando dati già validi
    const result = await VoteRestaurantService.vote(userId, body.restaurant_id, body.vote);

    // Notifiche real-time
    const notifications = await NotificationService.getLastByActor(userId);

    for (const notif of notifications) {
      notificationSocketService.sendToUser(notif.user_id, notif);
    }

    // Trasforma il model restituito in DTO
    const voteDto = new VoteRestaurantDTO(result.vote);

    res.status(200).json({
      action: result.action, // "created", "updated" o "deleted"
      vote: voteDto,
    });
  });

  /**
   * Recupera il voto espresso dall'utente loggato su un ristorante specifico.
   * Utile per mostrare lo stato del pulsante "upvote" / "downvote" nel frontend.
   */
  static getUserVote = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const restaurant_id = parseInt(req.params.restaurantId, 10);
    if (isNaN(restaurant_id)) throw new AppError("L'id del ristorante deve essere un numero", 400);

    const vote = await VoteRestaurantService.getUserVote(userId, restaurant_id);
    const voteDto = vote ? new VoteRestaurantDTO(vote) : null;

    res.status(200).json(voteDto);
  });
}
