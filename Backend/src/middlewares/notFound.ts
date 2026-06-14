import { Request, Response } from 'express';

/**
 * Middleware per la gestione delle risorse non trovate (404).
 * Viene eseguito quando nessuna delle rotte definite in precedenza ha gestito la richiesta.
 * Restituisce una risposta JSON indicando che l'URL richiesto non esiste.
 */
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ message: `Rotta ${req.originalUrl} non trovata` });
};
