import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';
import authMiddleware from '../middlewares/authMiddleware';

const router = Router();

/**
 * Definizione delle rotte per la gestione delle notifiche.
 * Tutte le rotte sono protette e richiedono autenticazione (authMiddleware).
 */

/**
 * GET /api/notifications
 * Recupera tutte le notifiche dell'utente loggato.
 */
router.get('/', authMiddleware, NotificationController.getAllByUser);

/**
 * GET /api/notifications/recent
 * Recupera le notifiche recenti (ultimi 7 giorni) dell'utente loggato.
 */
router.get('/recent', authMiddleware, NotificationController.getRecentByUser);

/**
 * PUT /api/notifications/mark-all-read
 * Segna tutte le notifiche dell'utente come lette.
 */
router.put('/mark-all-read', authMiddleware, NotificationController.markAllAsRead);

/**
 * PUT /api/notifications/:id/read
 * Segna una singola notifica come letta.
 */
router.put('/:id/read', authMiddleware, NotificationController.markAsRead);

/**
 * DELETE /api/notifications/:id
 * Elimina una notifica specifica.
 */
router.delete('/:id', authMiddleware, NotificationController.delete);

export default router;
