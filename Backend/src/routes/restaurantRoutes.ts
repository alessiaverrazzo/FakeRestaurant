import { Router } from 'express';
import { RestaurantController } from '../controllers/RestaurantController';
import authMiddleware from '../middlewares/authMiddleware';
import upload, { saveUploadedImage } from '../middlewares/upload';

const router = Router();

/**
 * Definizione delle rotte per la gestione dei ristoranti.
 * Include endpoint pubblici per la ricerca e la visualizzazione,
 * e endpoint protetti per la gestione (CRUD) da parte dei proprietari.
 */

// ==============================================================================
// ROTTE PROTETTE (Richiedono Autenticazione)
// ==============================================================================

/**
 * GET /api/restaurants/my-restaurants
 * Recupera tutti i ristoranti creati dall'utente loggato.
 */
router.get('/my-restaurants', authMiddleware, RestaurantController.getAllByUser);

/**
 * POST /api/restaurants
 * Crea un nuovo ristorante.
 * Supporta l'upload di un'immagine (multipart/form-data).
 */
router.post(
  '/',
  authMiddleware,
  upload.single('image'),
  saveUploadedImage,
  RestaurantController.create
);

/**
 * PUT /api/restaurants/:id
 * Aggiorna un ristorante esistente.
 * Solo il proprietario può effettuare questa operazione.
 * Supporta l'aggiornamento dell'immagine.
 */
router.put(
  '/:id',
  authMiddleware,
  upload.single('image'),
  saveUploadedImage,
  RestaurantController.update
);

/**
 * DELETE /api/restaurants/:id
 * Elimina un ristorante.
 * Solo il proprietario può effettuare questa operazione.
 */
router.delete('/:id', authMiddleware, RestaurantController.delete);

// ==============================================================================
// ROTTE HOMEPAGE (Statistiche)
// ==============================================================================

/**
 * GET /api/restaurants/top
 * Restituisce i 5 ristoranti migliori della settimana (basato su Wilson Score).
 */
router.get('/top', RestaurantController.getTopAllTime);

/**
 * GET /api/restaurants/flop
 * Restituisce i 5 ristoranti peggiori della settimana.
 */
router.get('/flop', RestaurantController.getFlopAllTime);

// ==============================================================================
// ROTTE PUBBLICHE (Ricerca e Dettaglio)
// ==============================================================================

/**
 * GET /api/restaurants/search
 * Cerca ristoranti per nome (query param: ?query=...).
 */
router.get('/search', RestaurantController.searchByName);

/**
 * GET /api/restaurants/nearby
 * Cerca ristoranti per posizione geografica (query params: ?lat=...&lng=...&radius=...).
 */
router.get('/nearby', RestaurantController.searchByPosition);

/**
 * GET /api/restaurants
 * Recupera la lista completa dei ristoranti.
 */
router.get('/', RestaurantController.getAll);

/**
 * GET /api/restaurants/:id
 * Recupera i dettagli di un singolo ristorante.
 */
router.get('/:id', RestaurantController.getById);

export default router;
