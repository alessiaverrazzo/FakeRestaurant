import { Router } from 'express';
import { VoteRestaurantController } from '../controllers/VoteRestaurantController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

/**
 * Definizione delle rotte per la gestione dei voti ai ristoranti.
 * Permette agli utenti autenticati di votare e controllare il proprio voto.
 */

// ==============================================================================
// ROTTE PROTETTE (Richiedono Autenticazione)
// ==============================================================================

/**
 * POST /api/votesRestaurant
 * Permette a un utente di votare un ristorante (toggle: crea, aggiorna o elimina).
 */
router.post('/', authMiddleware, VoteRestaurantController.vote);

/**
 * GET /api/votesRestaurant/user/:restaurantId
 * Recupera il voto dell'utente loggato per un ristorante specifico.
 */
router.get('/user/:restaurantId', authMiddleware, VoteRestaurantController.getUserVote);

export default router;
