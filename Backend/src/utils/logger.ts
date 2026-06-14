import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

/**
 * Configurazione della cartella di log.
 * Crea la cartella 'logs' nella root del progetto se non esiste.
 */
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

/**
 * Formato personalizzato per i log.
 * Include timestamp e livello in maiuscolo (es. [2023-10-27 10:00:00] [INFO] Messaggio).
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    info => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`
  )
);

/**
 * Transport per il salvataggio su file con rotazione giornaliera.
 * - Crea un nuovo file ogni giorno.
 * - Mantiene i log per 14 giorni.
 * - Comprime i log vecchi.
 */
const fileTransport = new DailyRotateFile({
  filename: 'app-%DATE%.log',
  dirname: logDir,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

/**
 * Transport per la console.
 * Utilizzato principalmente in ambiente di sviluppo per visualizzare i log colorati in tempo reale.
 */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => {
      // Colora solo il livello
      const level = winston.format.colorize().colorize(info.level, info.level.toUpperCase());
      return `[${info.timestamp}] [${level}] ${info.message}`;
    })
  )
});

/**
 * Istanza principale del logger Winston.
 * Configurato per registrare tutti i livelli di log (debug e superiori).
 */
const logger = winston.createLogger({
  level: 'debug', // logga tutti i livelli
  transports: [fileTransport]
});

// Aggiunge il logging su console se non si è in produzione
if (process.env.NODE_ENV !== 'production') {
  logger.add(consoleTransport);
}

/**
 * Middleware Express per il logging delle richieste HTTP.
 * Registra il metodo, l'URL, lo status code e la durata della richiesta al termine della stessa.
 */
export const logRequests = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

/**
 * Middleware Express per il logging degli errori.
 * Registra il messaggio di errore, il metodo e l'URL della richiesta che ha causato l'errore.
 */
export const logErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);

  next(err);
};


export default logger;
