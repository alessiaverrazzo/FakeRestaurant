import { RestaurantCardModel } from '@shared/components/restaurant-card/models/restaurant-card.model';

/**
 * Tipo che rappresenta un singolo risultato di ricerca.
 * Attualmente è un alias per `RestaurantCardModel`, poiché i risultati vengono visualizzati come card ristorante.
 */
export type SearchResult = RestaurantCardModel;
