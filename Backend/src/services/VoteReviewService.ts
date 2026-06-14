import VoteReviewRepository from '../repositories/VoteReviewRepository';
import VoteReview from '../models/VoteReview';
import ReviewService from './ReviewService';
import { AppError } from '../utils/AppError';

/**
 * Service per la gestione della logica di business relativa ai voti delle recensioni.
 * Gestisce il meccanismo di voto (toggle), il conteggio e il recupero dello stato del voto utente.
 */
class VoteReviewService {

  /**
   * Gestisce l'azione di voto di un utente su una recensione.
   * Implementa una logica di "toggle":
   * - Se il voto non esiste: lo crea.
   * - Se il voto esiste ed è uguale: lo rimuove (l'utente toglie il voto).
   * - Se il voto esiste ed è diverso: lo aggiorna (cambia da upvote a downvote o viceversa).
   * @param user_id ID dell'utente che vota.
   * @param review_id ID della recensione votata.
   * @param voteValue Valore del voto (1 o -1).
   * @returns Un oggetto contenente l'azione eseguita ('created', 'deleted', 'updated') e il voto aggiornato.
   */
  async vote(
    user_id: number,
    review_id: number,
    voteValue: 1 | -1
  ): Promise<{ action: 'created' | 'deleted' | 'updated'; vote: VoteReview }> {

    // Verifica che la recensione esista
    if (!await ReviewService.getById(review_id)) {
      throw new AppError('Recensione non trovata', 404);
    }

    const existingVote = await VoteReviewRepository.findByUserAndReview(user_id, review_id);

    if (!existingVote) {
      const vote = VoteReview.build({
        user_id,
        review_id,
        vote: voteValue
      });

      await VoteReviewRepository.create(vote);
      return { action: 'created', vote };
    }

    if (existingVote.vote === voteValue) {
      await VoteReviewRepository.delete(user_id, review_id);
      return { action: 'deleted', vote: existingVote };
    }

    existingVote.vote = voteValue;
    await VoteReviewRepository.update(existingVote);

    return { action: 'updated', vote: existingVote };
  }

  /**
   * Recupera il voto espresso da un utente specifico su una recensione.
   * Utile per mostrare all'utente se ha già votato e come.
   * @param user_id ID dell'utente.
   * @param review_id ID della recensione.
   */
  async getUserVote(user_id: number, review_id: number): Promise<VoteReview | null> {
    return await VoteReviewRepository.findByUserAndReview(user_id, review_id);
  }

  /**
   * Recupera il conteggio totale di upvotes e downvotes per una recensione.
   * Verifica preliminarmente l'esistenza della recensione.
   * @param review_id ID della recensione.
   */
  async getVotesCount(review_id: number): Promise<{ upvotes: number; downvotes: number }> {
    if (!await ReviewService.getById(review_id)) {
      throw new AppError('Recensione non trovata', 404);
    }

    return await VoteReviewRepository.getVotesCount(review_id);
  }

}

export default new VoteReviewService();
