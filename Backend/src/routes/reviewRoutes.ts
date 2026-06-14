import { Router } from 'express';
import { ReviewController } from '../controllers/ReviewController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

/**
 * Definizione delle rotte per la gestione delle recensioni.
 * Include endpoint per la creazione, modifica, cancellazione e visualizzazione delle recensioni.
 */

// ==============================================================================
// ROTTE PROTETTE (Richiedono Autenticazione)
// ==============================================================================

/**
 * GET /api/reviews/my-reviews
 * Recupera tutte le recensioni scritte dall'utente loggato.
 */
router.get('/my-reviews', authMiddleware, ReviewController.getAllByUser);

/**
 * POST /api/reviews
 * Crea una nuova recensione o una risposta.
 * Richiede il body con content e restaurant_id.
 */
router.post('/', authMiddleware, ReviewController.create);

/**
 * PUT /api/reviews/:id
 * Aggiorna il contenuto di una recensione esistente.
 * Solo l'autore può effettuare questa operazione.
 */
router.put('/:id', authMiddleware, ReviewController.update);

/**
 * DELETE /api/reviews/:id
 * Elimina una recensione.
 * Solo l'autore può effettuare questa operazione.
 */
router.delete('/:id', authMiddleware, ReviewController.delete);

// ==============================================================================
// ROTTE PUBBLICHE (Visualizzazione)
// ==============================================================================

/**
 * GET /api/reviews/top
 * Restituisce le 5 recensioni migliori della settimana (basato su Wilson Score).
 */
router.get('/top', ReviewController.getTopAllTime);

/**
 * GET /api/reviews/restaurant/:restaurantId
 * Recupera tutte le recensioni di un ristorante specifico.
 * Supporta parametri di ordinamento (?order=BEST|NEWEST|OLDEST).
 */
router.get('/restaurant/:restaurantId', ReviewController.getAllByRestaurant);

/**
 * GET /api/reviews/:id
 * Recupera una singola recensione con il suo thread di risposte.
 */
router.get('/:id', ReviewController.getById);

export default router;
