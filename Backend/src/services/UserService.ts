import UserRepository from '../repositories/UserRepository';
import PasswordResetRepository from '../repositories/PasswordResetRepository';
import { PasswordResetDTO } from '../dtos/passwordReset.dto';
import { hashPassword } from '../utils/hash';
import { sendEmail } from '../utils/email';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

/**
 * Service per la gestione della logica di business relativa agli utenti.
 * Gestisce registrazione, autenticazione, gestione profilo e recupero password.
 */
class UserService {
  /**
   * Registra un nuovo utente nel sistema.
   * Esegue validazioni su username, email e password, sanitizza gli input
   * e hash della password prima di salvare.
   * @param user L'istanza dell'utente da registrare.
   * @returns L'utente creato (con ID generato).
   */
  async register(user: User): Promise<User> {
    if (!user.username || !user.email || !user.password)
      throw new AppError('Compilare tutti i campi richiesti', 400);

    // Sanitizzazione username
    user.username = user.username
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 40);

    if (user.username.length < 3)
      throw new AppError('Lo username deve essere di almeno 3 caratteri', 400);

    // Sanitizzazione email
    user.email = user.email.trim().toLowerCase().slice(0, 100);

    if (!user.email.includes("@"))
      throw new AppError("Formato email non valido", 400);

    // Validazione password
    user.password = user.password.trim();
    if (user.password.length < 8)
      throw new AppError('La password deve essere di almeno 8 caratteri', 400);

    if (user.password.length > 100)
      throw new AppError('Password troppo lunga', 400);

    // Unicità username/email
    const existingEmail = await UserRepository.findByEmail(user.email);
    if (existingEmail) throw new AppError('Email già in uso', 400);

    const existingUsername = await UserRepository.findByUsername(user.username);
    if (existingUsername) throw new AppError('Username già in uso', 400);

    user.password = await hashPassword(user.password);

    const newUser = await UserRepository.create(user);
    user.id = newUser.id;

    return user;
  }

  /**
   * Autentica un utente verificando le credenziali.
   * Supporta login tramite username o email.
   * @param identifier Username o email dell'utente.
   * @param password Password in chiaro.
   * @returns L'utente autenticato se le credenziali sono corrette.
   */
  async login(identifier: string, password: string): Promise<User> {
    // Input validation (anti-DOS)
    if (!identifier || !password)
      throw new AppError("Credenziali errate", 401);

    if (identifier.length > 100 || password.length > 200)
      throw new AppError("Credenziali errate", 401);

    // Normalizzazione
    const cleanIdentifier = identifier.trim();

    const userRecord =
      (await UserRepository.findByEmail(cleanIdentifier)) ||
      (await UserRepository.findByUsername(cleanIdentifier));

    // Non rivelare se email esiste o meno
    if (!userRecord) throw new AppError('Credenziali errate', 401);

    const isValid = await userRecord.checkPassword(password);
    if (!isValid) throw new AppError('Credenziali errate', 401);

    return userRecord;
  }

  /**
   * Aggiorna i dati del profilo di un utente.
   * Gestisce l'aggiornamento di username (con controllo unicità), icona e password (con hashing).
   * @param id ID dell'utente da aggiornare.
   * @param data Oggetto contenente i campi opzionali da aggiornare.
   */
  async updateUser(
    id: number,
    data: { username?: string; icon_id?: number; password?: string }
  ): Promise<User> {

    const user = await UserRepository.findById(id);
    if (!user) throw new AppError("Utente non trovato", 404);

    // Aggiornamento username
    if (data.username !== undefined) {
      const sanitized = data.username
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 40);

      if (sanitized.length < 3)
        throw new AppError("Username troppo corto", 400);

      const user2 = await UserRepository.findByUsername(sanitized);
      if (user2 && user2.id !== id)
        throw new AppError("Username già in uso", 400);

      user.username = sanitized;
    }

    // Aggiornamento icona
    if (data.icon_id !== undefined) {
      if (data.icon_id < 1 || data.icon_id > 15)
        throw new AppError("Id icona non valido. Il valore deve essere tra 1 e 15", 400);
      user.icon_id = data.icon_id;
    }

    // Aggiornamento password
    if (data.password !== undefined) {
      if (data.password.trim().length < 8)
        throw new AppError("Password troppo corta", 400);

      user.password = await hashPassword(data.password);
    }

    await user.save();
    return user;
  }

  /**
   * Elimina un account utente.
   * @param user L'istanza dell'utente da eliminare.
   */
  async deleteUser(user: User): Promise<void> {
    const deleted = await UserRepository.delete(user.id);
    if (!deleted) throw new AppError("Errore durante eliminazione dell'utente", 500);
  }

  /**
   * Avvia la procedura di reset della password.
   * Genera un token univoco e invia un'email all'utente con il link di reset.
   * Non rivela se l'email esiste nel sistema per motivi di sicurezza.
   * @param user L'utente che ha richiesto il reset.
   * @param frontendUrl URL base del frontend per costruire il link.
   */
  async requestPasswordReset(user: User, frontendUrl: string): Promise<void> {
    const token = await PasswordResetRepository.create(user.id);
    const resetLink = `${frontendUrl}/reset-password/${token}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset",
        text: `Clicca il link per resettare la password: ${resetLink}`,
      });
    } catch (err) {
      throw new AppError('Impossibile inviare la mail per il reset', 500);
    }
  }

  /**
   * Completa la procedura di reset della password utilizzando un token valido.
   * Verifica il token, aggiorna la password e invalida il token usato.
   * @param data DTO contenente il token e la nuova password.
   */
  async resetPassword(data: PasswordResetDTO): Promise<void> {
    if (data.password.trim().length < 8)
      throw new AppError("La password deve essere di almeno 8 caratteri", 400);

    const record = await PasswordResetRepository.findByToken(data.token);
    if (!record) throw new AppError('Link scaduto o non valido', 400);

    const user = await UserRepository.findById(record.user_id);
    if (!user) throw new AppError('Utente non trovato', 404);

    const hashed = await hashPassword(data.password);
    user.password = hashed;
    await user.save();

    await PasswordResetRepository.delete(data.token);
  }

  /**
   * Cerca un utente tramite identificativo (email o username).
   * @param identifier Stringa di ricerca.
   */
  async getByIdentifier(identifier: string): Promise<User | null> {
    const clean = identifier.trim().toLowerCase();
    return (
      (await UserRepository.findByEmail(clean)) ||
      (await UserRepository.findByUsername(clean)) ||
      null
    );
  }

  /**
   * Cerca un utente tramite ID.
   * @param id ID dell'utente.
   */
  async getById(id: number): Promise<User | null> {
    return await UserRepository.findById(id);
  }

  /**
   * Recupera solo lo username di un utente dato il suo ID.
   * @param id ID dell'utente.
   */
  async getUsernameById(id: number): Promise<string | null> {
    const user = await UserRepository.findById(id);
    return user ? user.username : null;
  }
}

export default new UserService();
