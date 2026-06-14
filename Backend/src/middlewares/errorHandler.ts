import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

/**
 * Interfaccia che estende l'errore standard per includere un codice di stato HTTP opzionale.
 * Utile per gestire errori personalizzati come 404 o 403.
 */
interface ErrorWithStatus extends Error {
  status?: number;
}

/**
 * Middleware globale per la gestione degli errori.
 * Cattura qualsiasi errore passato tramite `next(err)` e invia una risposta formattata al client.
 *
 * @param err L'oggetto errore catturato.
 * @param req L'oggetto della richiesta Express.
 * @param res L'oggetto della risposta Express.
 * @param _next Funzione next (non utilizzata qui, ma necessaria per la firma del middleware di errore).
 */
export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Determina lo status code: usa quello dell'errore se presente, altrimenti 500 (Internal Server Error)
  const statusCode = err.status || 500;

  // Log dell'errore lato server (sempre) per debugging
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);

  // Messaggio sicuro per il client: nasconde i dettagli tecnici degli errori 500 in produzione
  const safeMessage =
    statusCode >= 500
      ? "Errore del server. Riprova più tardi."
      : err.message || "Errore nella richiesta.";

  // Invia la risposta JSON
  return res.status(statusCode).json({
    message: safeMessage,
    // Include lo stack trace solo in ambiente di sviluppo per facilitare il debug
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
