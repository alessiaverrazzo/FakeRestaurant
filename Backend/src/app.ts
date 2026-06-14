import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Rotte
import userRoutes from './routes/userRoutes';
import restaurantRoutes from './routes/restaurantRoutes';
import reviewRoutes from './routes/reviewRoutes';
import voteRestaurantRoutes from './routes/voteRestaurantRoutes';
import voteReviewRoutes from './routes/voteReviewRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Middleware custom
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { logRequests, logErrors } from './utils/logger';

dotenv.config();

/**
 * Inizializzazione dell'applicazione Express.
 * Questo oggetto 'app' gestirà tutte le richieste HTTP in arrivo.
 */
const app = express();

/**
 * Configurazione di Helmet per migliorare la sicurezza impostando vari header HTTP.
 * - xssFilter: Attiva il filtro XSS dei browser.
 * - noSniff: Impedisce al browser di interpretare i file come un tipo MIME diverso da quello dichiarato.
 * - hidePoweredBy: Rimuove l'header X-Powered-By per nascondere informazioni sul server.
 */
app.use(
  helmet({
    xssFilter: true,
    crossOriginResourcePolicy: false,
    noSniff: true,
    hidePoweredBy: true,
  })
);

/**
 * Configurazione della Content Security Policy (CSP).
 * Definisce le origini affidabili per script, connessioni, immagini, ecc.
 * È configurata per consentire il funzionamento di Angular e Socket.IO (WebSocket).
 */
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "connect-src": [
        "'self'",
        "http://localhost:4200",
        "ws://localhost:3000",
        "ws://localhost:4200",
      ],
      "img-src": ["'self'", "data:", "blob:", "http://localhost:3000"],
      "font-src": ["'self'", "data:"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
    },
  })
);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";

/**
 * Configurazione CORS (Cross-Origin Resource Sharing).
 * Consente solo al frontend specificato di effettuare richieste al backend.
 * 'credentials: true' è necessario perché si inviano cookie o header di autorizzazione.
 */
app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

/**
 * Middleware per limitare il numero di richieste da un singolo IP.
 * Protegge l'API da attacchi di forza bruta o Denial of Service (DoS).
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Troppe richieste da questo IP. Riprova tra qualche minuto.",
  },
});

app.use(globalLimiter);

/**
 * Middleware per il parsing del corpo delle richieste (body parsing).
 * Permette di leggere i dati inviati in formato JSON o URL-encoded.
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Middleware di logging personalizzato.
 * Registra i dettagli di ogni richiesta in ingresso (metodo, URL, IP, ecc.).
 */
app.use(logRequests);

/**
 * Configurazione per servire file statici (es. immagini caricate).
 * La cartella '../uploads' è mappata sul percorso pubblico '/uploads'.
 */
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * Registrazione delle rotte API.
 * Ogni prefisso (es. /api/users) è gestito da un router specifico.
 */
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/votesRestaurant', voteRestaurantRoutes);
app.use('/api/votesReview', voteReviewRoutes);
app.use('/api/notifications', notificationRoutes);

/**
 * Rotta di base per verificare che il server sia attivo.
 */
app.get('/', (req: Request, res: Response) => {
  res.send('Fakerestaurant API è in esecuzione');
});

/**
 * Middleware per la gestione degli errori.
 * - notFound: Gestisce le richieste a percorsi inesistenti (404).
 * - logErrors: Registra l'errore lato server.
 * - errorHandler: Invia una risposta formattata al client.
 */
app.use(notFound);
app.use(logErrors);
app.use(errorHandler);

export default app;
