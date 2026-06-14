import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

/**
 * Interfaccia che definisce le proprietà dell'utente autenticato.
 * Attualmente contiene solo l'ID, ma può essere estesa.
 */
export interface AuthUser {
  id: number;
}

/**
 * Estensione dell'interfaccia Request di Express per includere l'utente autenticato.
 * Permette di accedere a `req.user` nelle rotte protette senza errori di tipo.
 */
export interface AuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Middleware di autenticazione per proteggere le rotte.
 * Verifica la presenza e la validità del token JWT nell'header Authorization.
 * Se il token è valido, aggiunge l'utente alla richiesta e passa il controllo al prossimo middleware.
 */
const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  // Token assente o formato non corretto
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Autenticazione richiesta." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Autenticazione richiesta." });
  }

  try {
    // Verifica la firma e la scadenza del token
    const decoded = verifyToken(token);

    // Aggiunge l'ID utente decodificato all'oggetto richiesta
    req.user = { id: decoded.id };

    return next();
  } catch (err: any) {
    // Gestione specifica per token scaduto
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Sessione scaduta." });
    }

    // Token non valido o alterato
    return res.status(401).json({ message: "Autenticazione fallita." });
  }
};

export default authMiddleware;
