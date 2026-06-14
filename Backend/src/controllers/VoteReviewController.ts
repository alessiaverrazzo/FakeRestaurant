import { Response } from 'express';
import asyncHandler from '../middlewares/asyncHandler';
import VoteReviewService from '../services/VoteReviewService';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/authMiddleware';
import { CreateVoteReviewDTO, VoteReviewDTO } from '../dtos/voteReview.dto';
import NotificationService from '../services/NotificationService';
import { notificationSocketService } from '../services/NotificationSocketService';

/**
 * Controller per la gestione dei voti alle recensioni.
 * Espone endpoint per votare (toggle), recuperare il voto dell'utente corrente e ottenere il conteggio dei voti.
 */
export class VoteReviewController {

  /**
   * Gestisce l'azione di voto su una recensione.
   * Se il voto esiste già, lo aggiorna o lo rimuove (toggle).
   * Invia notifiche in tempo reale agli interessati (es. autore della recensione).
   */
  static vote = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const body: CreateVoteReviewDTO = req.body;

    if (!body.review_id) throw new AppError("La recensione é obbligatoria", 400);

    // Chiama il service passando dati già validi
    const result = await VoteReviewService.vote(userId, body.review_id, body.vote);

    // Notifiche real-time
    const notifications = await NotificationService.getLastByActor(userId);

    for (const notif of notifications) {
      notificationSocketService.sendToUser(notif.user_id, notif);
    }

    // Trasforma il model restituito in DTO
    const voteDto = new VoteReviewDTO(result.vote);

    res.status(200).json({
      action: result.action, // "created", "updated" o "deleted"
      vote: voteDto,
    });
  });

  /**
   * Recupera il voto espresso dall'utente loggato su una recensione specifica.
   * Utile per mostrare lo stato del pulsante "upvote" / "downvote" nel frontend.
   */
  static getUserVote = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const review_id = parseInt(req.params.reviewId, 10);
    if (isNaN(review_id)) throw new AppError("L'id della recensione deve essere un numero", 400);

    const vote = await VoteReviewService.getUserVote(userId, review_id);
    const voteDto = vote ? new VoteReviewDTO(vote) : null;

    res.status(200).json(voteDto);
  });

  /**
   * Recupera il conteggio totale di voti positivi e negativi per una recensione.
   */
  static getVotesCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const review_id = parseInt(req.params.reviewId, 10);
    if (isNaN(review_id)) throw new AppError("L'id della recensione deve essere un numero", 400);

    const votes = await VoteReviewService.getVotesCount(review_id);

    res.status(200).json({
      review_id,
      upvotes: votes.upvotes,
      downvotes: votes.downvotes
    });
  });

}
