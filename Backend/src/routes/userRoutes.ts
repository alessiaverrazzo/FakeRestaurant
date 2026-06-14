import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import authMiddleware from '../middlewares/authMiddleware';
import { authLimiter, passwordResetLimiter } from '../middlewares/rateLimiters';

const router = Router();

/**
 * Definizione delle rotte per la gestione degli utenti.
 * Include endpoint per autenticazione, gestione profilo e recupero password.
 */

// ==============================================================================
// AUTENTICAZIONE (Pubbliche con Rate Limit)
// ==============================================================================

/**
 * POST /api/users/register
 * Registra un nuovo utente.
 * Protetto da rate limiter per prevenire spam.
 */
router.post('/register', authLimiter, UserController.register);

/**
 * POST /api/users/login
 * Effettua il login e restituisce un token JWT.
 * Protetto da rate limiter per prevenire brute force.
 */
router.post('/login', authLimiter, UserController.login);

// ==============================================================================
// PASSWORD RESET (Pubbliche con Rate Limit specifico)
// ==============================================================================

/**
 * POST /api/users/password-reset
 * Richiede l'invio di un'email per il reset della password.
 */
router.post('/password-reset', passwordResetLimiter, UserController.requestPasswordReset);

/**
 * GET /api/users/password-reset/verify/:token
 * Verifica se il token di reset è valido (non scaduto).
 */
router.get('/password-reset/verify/:token', UserController.verifyResetToken);

/**
 * POST /api/users/password-reset/reset
 * Imposta la nuova password utilizzando un token valido.
 */
router.post('/password-reset/reset', passwordResetLimiter, UserController.resetPassword);

// ==============================================================================
// GESTIONE PROFILO (Protette)
// ==============================================================================

/**
 * GET /api/users/me
 * Recupera i dati dell'utente attualmente loggato.
 */
router.get('/me', authMiddleware, UserController.getMe);

/**
 * PUT /api/users/me
 * Aggiorna i dati del profilo (username, icona, password).
 */
router.put('/me', authMiddleware, UserController.updateUser);

/**
 * DELETE /api/users/me
 * Elimina l'account dell'utente loggato.
 */
router.delete('/me', authMiddleware, UserController.deleteUser);

export default router;
