import VoteReview from '../models/VoteReview';

/**
 * Repository per la gestione delle operazioni sul database relative ai voti delle recensioni.
 * Gestisce l'aggiunta, la modifica, la rimozione e il conteggio dei voti.
 */
class VoteReviewRepository {
  /**
   * Salva un nuovo voto nel database.
   * @param vote L'istanza del modello VoteReview da salvare.
   */
  async create(vote: VoteReview): Promise<VoteReview> {
    await vote.save();
    return vote;
  }

  /**
   * Aggiorna il valore di un voto esistente.
   * @param vote Oggetto contenente l'ID del voto e il nuovo valore.
   */
  async update(vote: VoteReview): Promise<VoteReview | null> {
    const existing = await VoteReview.findByPk(vote.id);
    if (!existing) return null;

    existing.vote = vote.vote;
    await existing.save();
    return existing;
  }

  /**
   * Elimina un voto dal database (l'utente rimuove la sua preferenza).
   * @param user_id ID dell'utente.
   * @param review_id ID della recensione.
   * @returns true se il voto è stato eliminato, false altrimenti.
   */
  async delete(user_id: number, review_id: number): Promise<boolean> {
    const deletedCount = await VoteReview.destroy({
      where: { user_id, review_id },
    });
    return deletedCount > 0;
  }

  /**
   * Cerca un voto specifico dato un utente e una recensione.
   * Utile per verificare se un utente ha già espresso una preferenza.
   * @param user_id ID dell'utente.
   * @param review_id ID della recensione.
   */
  async findByUserAndReview(user_id: number, review_id: number): Promise<VoteReview | null> {
    return await VoteReview.findOne({ where: { user_id, review_id } });
  }

  /**
   * Recupera tutti i voti espressi da un utente specifico.
   * @param user_id ID dell'utente.
   */
  async getVotesByUser(user_id: number): Promise<VoteReview[]> {
    return await VoteReview.findAll({ where: { user_id } });
  }

  /**
   * Calcola il numero totale di voti positivi e negativi per una recensione.
   * @param review_id ID della recensione.
   */
  async getVotesCount(review_id: number): Promise<{ upvotes: number; downvotes: number }> {
    const votes = await VoteReview.findAll({
      where: { review_id },
      attributes: ['vote'],
    });

    const upvotes = votes.filter(v => v.vote === 1).length;
    const downvotes = votes.filter(v => v.vote === -1).length;

    return { upvotes, downvotes };
  }

}

export default new VoteReviewRepository();
