import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper per gestire le eccezioni asincrone nelle rotte Express.
 *
 * In Express 4.x, gli errori lanciati all'interno di funzioni asincrone non vengono
 * catturati automaticamente dal middleware di gestione errori.
 * Questo wrapper assicura che qualsiasi errore (o Promise rejected) venga passato
 * alla funzione `next()`, evitando che la richiesta rimanga appesa o il server crashi.
 *
 * @param fn La funzione middleware asincrona da avvolgere.
 * @returns Una nuova funzione middleware che gestisce correttamente gli errori.
 */
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
