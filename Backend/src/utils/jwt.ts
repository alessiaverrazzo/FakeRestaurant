import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente dal file .env
dotenv.config();

/**
 * Chiave segreta utilizzata per firmare e verificare i token JWT.
 * Deve essere definita nel file .env e avere una lunghezza adeguata per garantire la sicurezza.
 */
const JWT_SECRET = process.env.JWT_SECRET;

// Verifica che la chiave segreta sia definita
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET non definita nelle variabili d'ambiente");
}

// Verifica che la chiave segreta abbia una lunghezza minima di sicurezza
if (JWT_SECRET.trim().length < 32) {
  throw new Error("JWT_SECRET troppo corto: minimo 32 caratteri.");
}

/**
 * Interfaccia che definisce la struttura del payload del token JWT.
 * Contiene le informazioni essenziali dell'utente (es. ID) che verranno criptate nel token.
 */
interface JwtPayload {
  id: number;
}

/**
 * Genera un nuovo token JWT firmato utilizzando l'algoritmo HS256.
 *
 * @param payload I dati da includere nel token (es. ID utente).
 * @param expiresInSec La durata di validità del token in secondi.
 * @returns La stringa del token JWT generato.
 */
export const generateToken = (payload: JwtPayload, expiresInSec: number): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresInSec,
    algorithm: "HS256",
  });
};

/**
 * Verifica la validità di un token JWT e ne decodifica il payload.
 *
 * @param token La stringa del token JWT da verificare.
 * @returns Il payload decodificato se il token è valido; altrimenti lancia un'eccezione.
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
