import { Restaurant } from '../models/Restaurant';
import VoteRestaurant from '../models/VoteRestaurant';
import { sequelize } from '../config/sequelize';
import { QueryTypes, Sequelize } from 'sequelize';
import User from '../models/User';

/**
 * Repository per la gestione delle operazioni sul database relative ai ristoranti.
 * Gestisce CRUD, ricerche geografiche e aggregazione dei voti.
 */
class RestaurantRepository {
  /**
   * Salva una nuova istanza di ristorante nel database.
   * @param restaurant L'istanza del modello Restaurant da salvare.
   */
  async create(restaurant: Restaurant): Promise<Restaurant> {
    await restaurant.save();
    return restaurant;
  }

  /**
   * Trova un ristorante tramite il suo ID primario.
   * @param id ID del ristorante.
   */
  async findById(id: number): Promise<Restaurant | null> {
    return await Restaurant.findByPk(id);
  }

  /**
   * Recupera tutti i ristoranti appartenenti a uno specifico utente.
   * @param user_id ID dell'utente proprietario.
   */
  async findByUserId(user_id: number): Promise<Restaurant[]> {
    return await Restaurant.findAll({ where: { user_id } });
  }

  /**
   * Aggiorna i dati di un ristorante esistente (nome, descrizione, immagine).
   * @param restaurant Oggetto contenente i nuovi dati e l'ID del ristorante da aggiornare.
   * @returns Il ristorante aggiornato o null se non trovato.
   */
  async update(restaurant: Restaurant): Promise<Restaurant | null> {
    const existing = await Restaurant.findByPk(restaurant.id);
    if (!existing) return null;

    existing.name = restaurant.name;
    existing.description = restaurant.description;

    if (restaurant.image_url !== undefined) {
      existing.image_url = restaurant.image_url;
    }

    await existing.save();
    return existing;
  }

  /**
   * Elimina un ristorante verificando che l'utente richiedente sia il proprietario.
   * @param userId ID dell'utente che richiede la cancellazione.
   * @param restaurantId ID del ristorante da eliminare.
   * @returns true se eliminato, false se non trovato o non autorizzato.
   */
  async delete(userId: number, restaurantId: number): Promise<boolean> {
    const deletedCount = await Restaurant.destroy({
      where: {
        id: restaurantId,
        user_id: userId,
      },
    });

    return deletedCount > 0;
  }

  /**
   * Recupera tutti i ristoranti presenti nel database.
   */
  async findAll(): Promise<Restaurant[]> {
    return await Restaurant.findAll();
  }

  /**
   * Trova un ristorante per ID includendo il conteggio dei voti positivi e negativi
   * e i dettagli del proprietario.
   * @param id ID del ristorante.
   */
  async findByIdWithVotes(id: number) {
    return await Restaurant.findOne({
      where: { id },
      attributes: {
        include: [
          [
            Sequelize.fn("COALESCE",
              Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN "VoteRestaurants"."vote" = 1 THEN 1 ELSE 0 END`)),
              0
            ),
            "upvotes"
          ],
          [
            Sequelize.fn("COALESCE",
              Sequelize.fn("SUM", Sequelize.literal(`CASE WHEN "VoteRestaurants"."vote" = -1 THEN 1 ELSE 0 END`)),
              0
            ),
            "downvotes"
          ]
        ]
      },
      include: [
        {
          model: VoteRestaurant,
          attributes: [],
          required: false,
        },
        {
          model: User,
          as: "owner",
          attributes: ["username", "icon_id"],
        }
      ],
      group: ["Restaurant.id", "owner.id"]
    });
  }

  /**
   * Recupera tutti i ristoranti con il conteggio aggregato dei voti.
   */
  async findAllWithVotes(): Promise<any[]> {
    return await Restaurant.findAll({
      attributes: {
        include: [
          [
            Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN "votes"."vote" = 1 THEN 1 ELSE 0 END`)), 0),
            'upvotes',
          ],
          [
            Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.literal(`CASE WHEN "votes"."vote" = -1 THEN 1 ELSE 0 END`)), 0),
            'downvotes',
          ],
        ],
      },
      include: [
        {
          model: VoteRestaurant,
          as: 'votes',
          attributes: [],
          required: false,
        },
      ],
      group: ['Restaurant.id'],
      raw: true, // restituisce oggetti plain con upvotes/downvotes numerici
    });
  }

  /**
   * Trova un ristorante per ID includendo solo i dati del proprietario.
   * @param id ID del ristorante.
   */
  async findByIdWithUser(id: number): Promise<Restaurant | null> {
    return await Restaurant.findByPk(id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['username', 'icon_id']
        }
      ]
    });
  }

  /**
   * Cerca ristoranti per nome (case-insensitive) includendo i voti.
   * @param query Stringa di ricerca.
   */
  async searchByName(query: string) {
    // --- Normalizzazione e limiti di sicurezza ---
    if (typeof query !== "string") query = "";
    query = query.trim().toLowerCase();

    // Limite massimo per evitare DoS o ricerche costose
    if (query.length > 100) query = query.slice(0, 100);

    // Pattern di ricerca
    const pattern = `%${query}%`;

    const results = await sequelize.query(
      `
      SELECT
        r.id,
        r.user_id,
        r.name,
        r.description,
        r.image_url,
        r.latitude,
        r.longitude,
        r.created_at,
        COALESCE(SUM(CASE WHEN rv.vote = 1  THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN rv.vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes
      FROM restaurants AS r
      LEFT JOIN restaurant_votes AS rv
        ON rv.restaurant_id = r.id
        WHERE LOWER(r.name) LIKE :pattern
      GROUP BY r.id
      ORDER BY r.name ASC
      `,
      {
        replacements: { pattern },
        type: QueryTypes.SELECT,
      }
    );

    return results as any[];
  }

  /**
   * Cerca ristoranti entro un certo raggio geografico (in km) da un punto dato.
   * Utilizza la formula dell'emisenoverso (Haversine) via SQL.
   * @param lat Latitudine del centro.
   * @param lng Longitudine del centro.
   * @param radiusKm Raggio di ricerca in km (max 50km).
   */
  async searchByPosition(lat: number, lng: number, radiusKm: number) {
    if (radiusKm > 50) radiusKm = 50;

    const results = await sequelize.query(
      `
      SELECT *
      FROM (
        SELECT
          r.id,
          r.user_id,
          r.name,
          r.description,
          r.image_url,
          r.latitude,
          r.longitude,
          r.created_at,
          COALESCE(SUM(CASE WHEN rv.vote = 1  THEN 1 ELSE 0 END), 0) AS upvotes,
          COALESCE(SUM(CASE WHEN rv.vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
          (
            6371 * acos(
              cos(radians(:lat)) *
              cos(radians(r.latitude)) *
              cos(radians(r.longitude) - radians(:lng)) +
              sin(radians(:lat)) *
              sin(radians(r.latitude))
            )
          ) AS distance
        FROM restaurants AS r
        LEFT JOIN restaurant_votes AS rv
          ON rv.restaurant_id = r.id
        GROUP BY r.id
      ) AS sub
      WHERE sub.distance <= :radiusKm
      ORDER BY sub.distance ASC
      `,
      {
        replacements: { lat, lng, radiusKm },
        type: QueryTypes.SELECT,
      }
    );

    return results as any[];
  }

  
}

export default new RestaurantRepository();
