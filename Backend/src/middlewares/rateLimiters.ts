import rateLimit from "express-rate-limit";

/**
 * Limitatore per le rotte di autenticazione (login, registrazione).
 * Consente un massimo di 10 tentativi ogni minuto per prevenire attacchi di forza bruta.
 * Se il limite viene superato, restituisce un errore 429.
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { message: "Troppi tentativi. Riprova più tardi." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Limitatore per le richieste di reset della password.
 * Molto più restrittivo (3 richieste all'ora) per evitare abusi del servizio di invio email
 * e proteggere gli utenti da spam o tentativi di enumerazione.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: "Troppe richieste di reset password. Attendi un'ora." },
  standardHeaders: true,
  legacyHeaders: false,
});
