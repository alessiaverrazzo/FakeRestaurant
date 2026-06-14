import VoteRestaurantRepository from '../repositories/VoteRestaurantRepository';
import VoteRestaurant from '../models/VoteRestaurant';
import RestaurantService from './RestaurantService';
import { AppError } from '../utils/AppError';

/**
 * Service per la gestione della logica di business relativa ai voti dei ristoranti.
 * Gestisce il meccanismo di voto (toggle), il conteggio e il recupero dello stato del voto utente.
 */
class VoteRestaurantService {

  /**
   * Gestisce l'azione di voto di un utente su un ristorante.
   * Implementa una logica di "toggle":
   * - Se il voto non esiste: lo crea.
   * - Se il voto esiste ed è uguale: lo rimuove (l'utente toglie il voto).
   * - Se il voto esiste ed è diverso: lo aggiorna (cambia da upvote a downvote o viceversa).
   * @param userId ID dell'utente che vota.
   * @param restaurant_id ID del ristorante votato.
   * @param voteValue Valore del voto (1 o -1).
   * @returns Un oggetto contenente l'azione eseguita ('created', 'deleted', 'updated') e il voto aggiornato.
   */
  async vote(
    userId: number,
    restaurant_id: number,
    voteValue: 1 | -1
  ): Promise<{ action: "created" | "deleted" | "updated"; vote: VoteRestaurant }> {

    // Verifica che il ristorante esista
    const restaurant = await RestaurantService.getById(restaurant_id);
    if (!restaurant) throw new AppError("Ristorante non trovato", 404);

    const existingVote = await VoteRestaurantRepository.findByUserAndRestaurant(
      userId,
      restaurant_id
    );

    if (!existingVote) {
      const vote = VoteRestaurant.build({
        user_id: userId,
        restaurant_id,
        vote: voteValue,
      });
      await VoteRestaurantRepository.create(vote);
      return { action: "created", vote };
    }

    if (existingVote.vote === voteValue) {
      await VoteRestaurantRepository.delete(userId, restaurant_id);
      return { action: "deleted", vote: existingVote };
    }

    existingVote.vote = voteValue;
    await VoteRestaurantRepository.update(existingVote);

    return { action: "updated", vote: existingVote };
  }

  /**
   * Recupera il conteggio totale di upvotes e downvotes per un ristorante.
   * Verifica preliminarmente l'esistenza del ristorante.
   * @param restaurant_id ID del ristorante.
   */
  async getVotesCount(restaurant_id: number): Promise<{ upvotes: number; downvotes: number }> {
    if (await RestaurantService.getById(restaurant_id) == null)
      throw new AppError('Ristorante non trovato', 404);

    return await VoteRestaurantRepository.getVotesCountForRestaurant(restaurant_id);
  }

  /**
   * Recupera il voto espresso da un utente specifico su un ristorante.
   * Utile per mostrare all'utente se ha già votato e come.
   * @param user_id ID dell'utente.
   * @param restaurant_id ID del ristorante.
   */
  async getUserVote(user_id: number, restaurant_id: number): Promise<VoteRestaurant | null> {
    return await VoteRestaurantRepository.findByUserAndRestaurant(user_id, restaurant_id);
  }
}

export default new VoteRestaurantService();
