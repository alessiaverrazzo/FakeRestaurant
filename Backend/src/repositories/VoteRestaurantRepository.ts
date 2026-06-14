import VoteRestaurant from '../models/VoteRestaurant';

/**
 * Repository per la gestione delle operazioni sul database relative ai voti dei ristoranti.
 * Gestisce l'aggiunta, la modifica, la rimozione e il conteggio dei voti.
 */
class VoteRestaurantRepository {
  /**
   * Salva un nuovo voto nel database.
   * @param vote L'istanza del modello VoteRestaurant da salvare.
   */
  async create(vote: VoteRestaurant): Promise<VoteRestaurant> {
    await vote.save();
    return vote;
  }

  /**
   * Cerca un voto specifico dato un utente e un ristorante.
   * Utile per verificare se un utente ha già espresso una preferenza.
   * @param user_id ID dell'utente.
   * @param restaurant_id ID del ristorante.
   */
  async findByUserAndRestaurant(user_id: number, restaurant_id: number): Promise<VoteRestaurant | null> {
    return await VoteRestaurant.findOne({ where: { user_id, restaurant_id } });
  }

  /**
   * Aggiorna il valore di un voto esistente.
   * @param vote Oggetto contenente l'ID del voto e il nuovo valore.
   */
  async update(vote: VoteRestaurant): Promise<VoteRestaurant | null> {
    const existing = await VoteRestaurant.findByPk(vote.id);
    if (!existing) return null;

    existing.vote = vote.vote;
    await existing.save();
    return existing;
  }

  /**
   * Elimina un voto dal database (l'utente rimuove la sua preferenza).
   * @param user_id ID dell'utente.
   * @param restaurant_id ID del ristorante.
   * @returns true se il voto è stato eliminato, false altrimenti.
   */
  async delete(user_id: number, restaurant_id: number): Promise<boolean> {
    const deletedCount = await VoteRestaurant.destroy({
      where: { user_id, restaurant_id },
    });
    return deletedCount > 0;
  }

  /**
   * Calcola il numero totale di voti positivi e negativi per un ristorante.
   * @param restaurant_id ID del ristorante.
   */
  async getVotesCountForRestaurant(restaurant_id: number): Promise<{ upvotes: number; downvotes: number }> {
    const votes = await VoteRestaurant.findAll({
      where: { restaurant_id },
      attributes: ['vote'],
    });

    const upvotes = votes.filter(v => v.vote === 1).length;
    const downvotes = votes.filter(v => v.vote === -1).length;

    return { upvotes, downvotes };
  }
}

export default new VoteRestaurantRepository();
