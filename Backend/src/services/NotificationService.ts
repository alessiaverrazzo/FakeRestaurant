import NotificationRepository from '../repositories/NotificationRepository';
import Notification from '../models/Notification';
import { AppError } from '../utils/AppError';

/**
 * Service per la gestione della logica di business relativa alle notifiche.
 * Interagisce con il NotificationRepository e gestisce validazioni e controlli di accesso.
 */
class NotificationService {
  /**
   * Crea una nuova notifica.
   * @param notification L'istanza della notifica da creare.
   */
  async create(notification: Notification): Promise<Notification> {
    return await NotificationRepository.create(notification);
  }

  /**
   * Recupera una notifica per ID.
   * Lancia un errore se la notifica non esiste.
   * @param id ID della notifica.
   */
  async getById(id: number): Promise<Notification> {
    const notif = await NotificationRepository.findById(id);
    if (!notif) throw new AppError("Notifica non trovata", 404);
    return notif;
  }

  /**
   * Recupera tutte le notifiche di un utente.
   * @param userId ID dell'utente.
   */
  async getByUserId(userId: number): Promise<Notification[]> {
    return await NotificationRepository.findByUserId(userId);
  }

  /**
   * Recupera le notifiche recenti di un utente (es. ultimi 7 giorni).
   * @param userId ID dell'utente.
   */
  async getRecentByUserId(userId: number): Promise<Notification[]> {
    return await NotificationRepository.findRecentByUserId(userId);
  }

  /**
   * Segna una notifica specifica come letta.
   * Verifica che la notifica esista e appartenga all'utente richiedente.
   * @param userId ID dell'utente che sta leggendo la notifica.
   * @param id ID della notifica.
   */
  async markAsRead(userId: number, id: number): Promise<void> {
    const notif = await NotificationRepository.findById(id);
    if (!notif) throw new AppError("Notifica non trovata", 404);
    if (notif.user_id !== userId) throw new AppError("Non autorizzato", 403);

    await NotificationRepository.markAsRead(id);
  }

  /**
   * Segna tutte le notifiche di un utente come lette.
   * @param userId ID dell'utente.
   */
  async markAllAsRead(userId: number): Promise<void> {
    await NotificationRepository.markAllAsRead(userId);
  }

  /**
   * Elimina una notifica.
   * Verifica che la notifica esista e appartenga all'utente richiedente.
   * @param data Oggetto contenente l'ID della notifica e l'ID dell'utente.
   */
  async delete(data: { id: number; userId: number }): Promise<void> {
    const notif = await NotificationRepository.findById(data.id);
    if (!notif) throw new AppError("Notifica non trovata", 404);

    if (notif.user_id !== data.userId)
      throw new AppError("Non autorizzato", 403);

    await NotificationRepository.delete(data.id, data.userId);
  }

  /**
   * Recupera le ultime notifiche generate da un attore specifico.
   * Utile per controlli anti-spam o debouncing.
   * @param actorId ID dell'utente attore.
   */
  async getLastByActor(actorId: number): Promise<Notification[]> {
    return await NotificationRepository.findRecentByActor(actorId);
  }
}

export default new NotificationService();
