import { Op } from 'sequelize';
import Notification from '../models/Notification';
import Review from '../models/Review';
import Restaurant from '../models/Restaurant';
import User from '../models/User';


/**
 * Repository per la gestione delle operazioni sul database relative alle notifiche.
 * Centralizza la logica di accesso ai dati per mantenere puliti i controller.
 */
class NotificationRepository {

  /**
   * Crea e salva una nuova notifica nel database.
   * @param notification Istanza del modello Notification da salvare.
   */
  async create(notification: Notification): Promise<Notification> {
    await notification.save();
    return notification;
  }

  /**
   * Trova una notifica per ID includendo i dettagli dell'attore e del target (recensione/ristorante).
   * @param id ID della notifica.
   */
  async findById(id: number): Promise<Notification | null> {
    return await Notification.findByPk(id, {
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["id", "username"]
        },
        {
          model: Review,
          as: 'review',
          attributes: ['id', 'restaurant_id', 'parent_review_id']
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id']
        }
      ]
    });
  }

  /**
   * Recupera tutte le notifiche di un utente specifico.
   * Le notifiche sono ordinate dalla più recente alla più vecchia.
   * @param user_id ID dell'utente destinatario.
   */
  async findByUserId(user_id: number): Promise<Notification[]> {
    return await Notification.findAll({
      where: { user_id },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Review,
          as: 'review',
          attributes: ['id', 'restaurant_id', 'parent_review_id']
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id']
        },
        {
          model: User,
          as: "actor",
          attributes: ["id", "username"]
        },
      ]
    });
  }

  /**
   * Recupera le notifiche di un utente degli ultimi 7 giorni.
   * @param user_id ID dell'utente.
   */
  async findRecentByUserId(user_id: number): Promise<Notification[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await Notification.findAll({
      where: {
        user_id,
        created_at: { [Op.gte]: sevenDaysAgo },
      },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Review,
          as: 'review',
          attributes: ['id', 'restaurant_id', 'parent_review_id']
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['id']
        },
        {
          model: User,
          as: "actor",
          attributes: ["id", "username"]
        },
      ]
    });
  }

  /**
   * Segna una singola notifica come letta.
   * @param id ID della notifica.
   * @returns true se l'operazione ha successo, false se la notifica non esiste.
   */
  async markAsRead(id: number): Promise<boolean> {
    const notif = await Notification.findByPk(id);
    if (!notif) return false;

    notif.is_read = true;
    await notif.save();
    return true;
  }

  /**
   * Segna come lette tutte le notifiche non lette di un utente.
   * @param user_id ID dell'utente.
   * @returns Il numero di notifiche aggiornate.
   */
  async markAllAsRead(user_id: number): Promise<number> {
    const [count] = await Notification.update(
      { is_read: true },
      { where: { user_id, is_read: false } }
    );
    return count;
  }

  /**
   * Elimina una notifica specifica, verificando che appartenga all'utente.
   * @param id ID della notifica.
   * @param user_id ID dell'utente proprietario.
   * @returns true se eliminata, false altrimenti.
   */
  async delete(id: number, user_id: number): Promise<boolean> {
    const count = await Notification.destroy({
      where: { id, user_id },
    });
    return count > 0;
  }

  /**
   * Trova notifiche create da un attore specifico negli ultimi 2 secondi.
   * Utilizzato spesso per prevenire spam o duplicazione di eventi ravvicinati.
   * @param actorId ID dell'utente che ha generato l'evento.
   */
  async findRecentByActor(actorId: number): Promise<Notification[]> {
    return await Notification.findAll({
      where: {
        actor_id: actorId,
        created_at: { [Op.gte]: new Date(Date.now() - 2000) }
      },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["id", "username"]
        }
      ]
    });
  }
}

export default new NotificationRepository();
