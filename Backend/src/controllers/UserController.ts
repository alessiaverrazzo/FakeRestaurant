import { Request, Response } from 'express';
import asyncHandler from '../middlewares/asyncHandler';
import UserService from '../services/UserService';
import { RegisterDTO, LoginDTO, UserDTO, AuthResponseDTO, UpdateUserDTO } from '../dtos/user.dto';
import { PasswordResetDTO } from '../dtos/passwordReset.dto';
import { generateToken } from '../utils/jwt';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import PasswordResetRepository from '../repositories/PasswordResetRepository';
import { AppError } from '../utils/AppError';

/**
 * Controller per la gestione degli utenti.
 * Espone endpoint per autenticazione (login/register), gestione profilo e recupero password.
 */
export class UserController {

  /**
   * Gestisce la registrazione di un nuovo utente.
   * Valida i dati di input, crea l'utente tramite il servizio e restituisce un token JWT.
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const body: RegisterDTO = req.body;

    if (!body.username || !body.email || !body.password) {
      throw new AppError("Campi obbligatori mancanti.", 400);
    }

    // Costruisco istanza User (raw data)
    const user = User.build({
      username: body.username,
      email: body.email,
      password: body.password,
      icon_id: body.icon_id,
    });

    const newUser = await UserService.register(user);

    // Generazione token
    const token = generateToken({ id: newUser.id }, 60 * 60 * 24 * 7);

    const userDTO = new UserDTO({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      icon_id: newUser.icon_id,
    });

    res.status(201).json(new AuthResponseDTO(userDTO, token));
  });

  /**
   * Gestisce il login utente.
   * Verifica le credenziali (username/email e password) e restituisce un token JWT se valide.
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const body: LoginDTO = req.body;

    if (!body.identifier || !body.password) {
      throw new AppError("Campi obbligatori mancanti.", 400);
    }

    const user = await UserService.login(body.identifier, body.password);

    const token = generateToken({ id: user.id }, 60 * 60 * 24 * 7);

    const userDTO = new UserDTO({
      id: user.id,
      username: user.username,
      email: user.email,
      icon_id: user.icon_id,
    });

    res.status(200).json(new AuthResponseDTO(userDTO, token));
  });

  /**
   * Aggiorna i dati del profilo dell'utente autenticato.
   * Permette di modificare username, icona e password.
   */
  static updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const body: UpdateUserDTO = req.body;

    if (
      body.username === undefined &&
      body.icon_id === undefined &&
      body.password === undefined
    ) {
      throw new AppError("Almeno un campo richiesto", 400);
    }

    const updatedUser = await UserService.updateUser(userId, {
      username: body.username,
      icon_id: body.icon_id,
      password: body.password,
    });

    const userDTO = new UserDTO({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      icon_id: updatedUser.icon_id,
    });

    res.status(200).json(userDTO);
  });

  /**
   * Elimina l'account dell'utente autenticato.
   * Questa azione è irreversibile.
   */
  static deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const user = User.build({ id: userId } as any);
    await UserService.deleteUser(user);

    res.status(204).send();
  });

  /**
   * Avvia la procedura di reset della password.
   * Invia un'email con il link di reset se l'email fornita corrisponde a un utente esistente.
   * Per sicurezza, restituisce sempre lo stesso messaggio generico.
   */
  static requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError("L'email é obbligatoria", 400);
    }

    const frontendUrl = process.env.FRONTEND_URL as string;

    // Recupero utente senza rivelare se esiste
    const userRecord = await UserService.getByIdentifier(email);

    if (userRecord) {
      await UserService.requestPasswordReset(userRecord, frontendUrl);
    }

    res.status(200).json({
      message: "Se l'utente esiste, verrà inviata un'email per il reset della password."
    });
  });

  /**
   * Verifica se un token di reset password è valido e non scaduto.
   * Utile per il frontend per mostrare il form di reset solo se il link è valido.
   */
  static verifyResetToken = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;

    const record = await PasswordResetRepository.findByToken(token);

    if (!record) {
      return res.status(400).json({
        valid: false,
        message: "Token non valido o scaduto."
      });
    }

    return res.status(200).json({ valid: true });
  });

  /**
   * Completa il reset della password utilizzando il token e la nuova password.
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const body: PasswordResetDTO = req.body;

    await UserService.resetPassword(body);

    res.status(200).json({ message: "Password aggiornata con successo" });
  });

  /**
   * Recupera i dati dell'utente attualmente autenticato.
   * Utilizza l'ID estratto dal token JWT.
   */
  static getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const user = await UserService.getById(userId);
    if (!user) throw new AppError("Utente non trovato", 404);

    const dto = new UserDTO({
      id: user.id,
      username: user.username,
      email: user.email,
      icon_id: user.icon_id,
    });

    res.status(200).json(dto);
  });
}
