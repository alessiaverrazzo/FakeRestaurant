import { User } from "../models/User";

/**
 * Repository per la gestione delle operazioni sul database relative agli utenti.
 * Gestisce la creazione, ricerca, aggiornamento ed eliminazione degli account utente.
 */
class UserRepository {
  /**
   * Salva un nuovo utente nel database.
   * @param user L'istanza del modello User da salvare.
   */
  async create(user: User): Promise<User> {
    await user.save();
    return user;
  }

  /**
   * Cerca un utente tramite il suo indirizzo email.
   * @param email L'email da cercare.
   */
  async findByEmail(email: string): Promise<User | null> {
    return await User.findOne({ where: { email } });
  }

  /**
   * Cerca un utente tramite il suo username.
   * @param username Lo username da cercare.
   */
  async findByUsername(username: string): Promise<User | null> {
    return await User.findOne({ where: { username } });
  }

  /**
   * Cerca un utente tramite il suo ID univoco.
   * @param id L'ID dell'utente.
   */
  async findById(id: number): Promise<User | null> {
    return await User.findByPk(id);
  }

  /**
   * Aggiorna i dati di un utente esistente (username, icona, password).
   * Verifica quali campi sono stati modificati prima di salvare.
   * @param user Oggetto contenente l'ID e i campi da aggiornare.
   */
  async update(user: User): Promise<User | null> {
    const existing = await User.findByPk(user.id);
    if (!existing) return null;

    if (user.username !== undefined)
      existing.username = user.username;
    if (user.icon_id !== undefined)
      existing.icon_id = user.icon_id;
    if (user.password !== undefined)
      existing.password = user.password;

    await existing.save();
    return existing;
  }

  /**
   * Elimina un account utente dal database.
   * @param userId L'ID dell'utente da eliminare.
   * @returns true se l'eliminazione ha avuto successo, false altrimenti.
   */
  async delete(userId: number): Promise<boolean> {
    const deletedCount = await User.destroy({ where: { id: userId } });
    return deletedCount > 0;
  }
}

export default new UserRepository();
