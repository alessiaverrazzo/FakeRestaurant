import { Router } from 'express';
import { VoteReviewController } from '../controllers/VoteReviewController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

/**
 * Definizione delle rotte per la gestione dei voti alle recensioni.
 * Permette agli utenti di votare, controllare il proprio voto e visualizzare i conteggi.
 */

// ==============================================================================
// ROTTE PROTETTE (Richiedono Autenticazione)
// ==============================================================================

/**
 * POST /api/votesReview
 * Permette a un utente di votare una recensione (toggle: crea, aggiorna o elimina).
 */
router.post('/', authMiddleware, VoteReviewController.vote);

/**
 * GET /api/votesReview/user/:reviewId
 * Recupera il voto dell'utente loggato per una recensione specifica.
 */
router.get('/user/:reviewId', authMiddleware, VoteReviewController.getUserVote);

// ==============================================================================
// ROTTE PUBBLICHE
// ==============================================================================

/**
 * GET /api/votesReview/count/:reviewId
 * Recupera il conteggio totale di upvotes e downvotes per una recensione.
 */
router.get('/count/:reviewId', VoteReviewController.getVotesCount);

export default router;
