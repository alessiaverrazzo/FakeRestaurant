import { Review } from '../models/Review';
import { VoteReview } from '../models/VoteReview';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { Sequelize, QueryTypes, Op } from 'sequelize';
import { sequelize } from '../config/sequelize';

/**
 * Repository per la gestione delle operazioni sul database relative alle recensioni.
 * Gestisce il ciclo di vita delle recensioni, inclusi i voti e le aggregazioni complesse.
 */
class ReviewRepository {
  /**
   * Salva una nuova recensione nel database.
   * @param review L'istanza del modello Review da salvare.
   */
  async create(review: Review): Promise<Review> {
    await review.save();
    return review;
  }

  /**
   * Trova una recensione per ID includendo il conteggio dei voti (positivi/negativi)
   * e i dettagli dell'autore.
   * @param id ID della recensione.
   */
  async findByIdWithVotes(id: number): Promise<any | null> {
    const review = await Review.findOne({
      where: { id },
      attributes: {
        include: [
          [
            Sequelize.literal(`COALESCE(SUM(CASE WHEN votes.vote = 1 THEN 1 ELSE 0 END), 0)`),
            'upvotes',
          ],
          [
            Sequelize.literal(`COALESCE(SUM(CASE WHEN votes.vote = -1 THEN 1 ELSE 0 END), 0)`),
            'downvotes',
          ],
        ],
      },
      include: [
        {
          model: VoteReview,
          as: 'votes',
          attributes: [],
          required: false, // lasciare false, altrimenti esclude recensioni senza voti
        },
        {
          model: User,
          as: 'user',
          attributes: ['username', 'icon_id'],
          required: false
        }
      ],
      group: ['Review.id', 'user.id'],
      subQuery: false,
    });

    if (review === null) return null;
    return {
      ...review.get({ plain: true }),
      upvotes: parseInt((review as any)?.get('upvotes') ?? '0', 10) || 0,
      downvotes: parseInt((review as any)?.get('downvotes') ?? '0', 10) || 0,
    };
  }

  /**
   * Recupera tutte le recensioni scritte da un utente specifico.
   * Include il conteggio dei voti e il nome del ristorante recensito.
   * @param user_id ID dell'utente.
   */
  async findByUserId(user_id: number): Promise<any | null> {
    const reviews = await Review.findAll({
      where: { user_id },
      attributes: {
        include: [
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal(`CASE WHEN "votes"."vote" = 1 THEN 1 ELSE 0 END`)
            ),
            'upvotes',
          ],
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal(`CASE WHEN "votes"."vote" = -1 THEN 1 ELSE 0 END`)
            ),
            'downvotes',
          ],
        ],
      },
      include: [
        {
          model: VoteReview,
          as: 'votes',
          attributes: [],
          required: false, // lasciare false, altrimenti esclude recensioni senza voti
        },
        {
          model: Restaurant,
          as: 'restaurant',
          attributes: ['name'],
          required: false,
        }
      ],
      group: ["Review.id", "restaurant.id"],
      order: [['created_at', 'ASC']],
    });

    const reviewsReturned = reviews.map(r => ({
      ...r.get({ plain: true }),
      upvotes: parseInt((r as any)?.get('upvotes') ?? '0', 10) || 0,
      downvotes: parseInt((r as any)?.get('downvotes') ?? '0', 10) || 0,
    }));
    return reviewsReturned.map((r: any) => ({
      ...r,
      restaurant_name: r.restaurant?.name ?? null
    }));
  }

  /**
   * Recupera tutte le recensioni associate a un ristorante specifico.
   * Include il conteggio dei voti e i dettagli dell'autore.
   * @param restaurant_id ID del ristorante.
   */
  async findByRestaurantIdWithVotes(restaurant_id: number): Promise<any[]> {
    const reviews = await Review.findAll({
      where: {
        restaurant_id,
      },

      attributes: {
        include: [
          [
            Sequelize.literal(`COALESCE(SUM(CASE WHEN votes.vote = 1 THEN 1 ELSE 0 END), 0)`),
            "upvotes"
          ],
          [
            Sequelize.literal(`COALESCE(SUM(CASE WHEN votes.vote = -1 THEN 1 ELSE 0 END), 0)`),
            "downvotes"
          ],
          [Sequelize.col("user.username"), "username"],
          [Sequelize.col("user.icon_id"), "icon_id"]
        ]
      },

      include: [
        {
          model: VoteReview,
          as: "votes",
          attributes: [],
          required: false
        },
        {
          model: User,
          as: "user",
          attributes: []
        }
      ],

      group: [
        "Review.id",
        "user.id",
        "user.username",
        "user.icon_id"
      ],

      order: [["created_at", "ASC"]],
      subQuery: false
    });

    return reviews.map(r => ({
      ...r.get({ plain: true }),
      upvotes: Number(r.get("upvotes") ?? 0),
      downvotes: Number(r.get("downvotes") ?? 0),
      user: {
        username: r.get("username") ?? null,
        icon_id: r.get("icon_id") ?? null
      }
    }));
  }

  /**
   * Aggiorna il contenuto di una recensione esistente.
   * @param review Oggetto contenente l'ID e il nuovo contenuto.
   */
  async update(review: Review): Promise<Review | null> {
    const existing = await Review.findByPk(review.id);
    if (!existing) return null;

    existing.content = review.content;
    await existing.save();
    return existing;
  }

  /**
   * Elimina una recensione verificando che l'utente richiedente sia l'autore.
   * @param reviewId ID della recensione.
   * @param userId ID dell'utente.
   */
  async delete(reviewId: number, userId: number): Promise<boolean> {
    const deletedCount = await Review.destroy({
      where: {
        id: reviewId,
        user_id: userId
      }
    });

    return deletedCount > 0;
  }

  /**
   * Recupera tutte le recensioni principali (top-level) presenti nel database.
   * Include il conteggio dei voti positivi e negativi e il nome del ristorante associato.
   * Non considera le sottorecensioni.
   */
  async findAllWithVotesBasic() {
    const [rows] = await sequelize.query(
      `
      SELECT
        r.id,
        r.user_id,
        r.restaurant_id,
        r.content,
        r.created_at,
        r.updated_at,
        rest.name AS restaurant_name,
        COALESCE(SUM(CASE WHEN rv.vote = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN rv.vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes
      FROM reviews r
      LEFT JOIN review_votes rv ON rv.review_id = r.id
      LEFT JOIN restaurants rest ON rest.id = r.restaurant_id
      WHERE r.parent_review_id IS NULL
      GROUP BY r.id, r.user_id, r.restaurant_id, r.content, r.created_at, r.updated_at, rest.name
      `
    );

    return (rows as any[]).map(r => ({
      ...r,
      upvotes: Number(r.upvotes ?? 0),
      downvotes: Number(r.downvotes ?? 0),
    }));
  }

  /**
   * Recupera le recensioni principali (top-level) di un ristorante.
   * Supporta diversi ordinamenti: BEST (più votate), NEWEST (più recenti), OLDEST (più vecchie).
   * @param restaurant_id ID del ristorante.
   * @param order Criterio di ordinamento.
   */
  async findTopLevelByRestaurantId(
    restaurant_id: number,
    order: 'BEST' | 'NEWEST' | 'OLDEST' = 'BEST'
  ): Promise<Review[]> {

    // Normalizzazione ordine (difesa extra)
    const safeOrder =
      order === 'NEWEST' || order === 'OLDEST' || order === 'BEST'
        ? order
        : 'BEST';

    const reviews: any[] = await sequelize.query(
      `
      SELECT 
        r.id,
        r.user_id,
        r.restaurant_id,
        r.parent_review_id,
        r.content,
        r.created_at,
        r.updated_at,
        u.username,
        u.icon_id,
        COALESCE(SUM(CASE WHEN rv.vote = 1 THEN 1 ELSE 0 END), 0)   AS upvotes,
        COALESCE(SUM(CASE WHEN rv.vote = -1 THEN 1 ELSE 0 END), 0) AS downvotes
      FROM reviews r
      LEFT JOIN review_votes rv
        ON rv.review_id = r.id
      LEFT JOIN users u
        ON u.id = r.user_id
      WHERE r.restaurant_id = :restaurant_id
        AND r.parent_review_id IS NULL 
      GROUP BY 
        r.id, r.user_id, r.restaurant_id, r.parent_review_id,
        r.content, r.created_at, r.updated_at,
        u.username, u.icon_id
      ORDER BY
        CASE WHEN :order = 'NEWEST' THEN r.created_at END DESC,
        CASE WHEN :order = 'OLDEST' THEN r.created_at END ASC,
        CASE WHEN :order = 'BEST'   THEN (COALESCE(SUM(CASE WHEN rv.vote = 1 THEN 1 ELSE 0 END),0)
                                        - COALESCE(SUM(CASE WHEN rv.vote = -1 THEN 1 ELSE 0 END),0))
        END DESC
      `,
      {
        replacements: { restaurant_id, order: safeOrder },
        type: QueryTypes.SELECT,
      }
    );

    // Conversioni numeriche finali
    return reviews.map(r => ({
      ...r,
      upvotes: Number(r.upvotes ?? 0),
      downvotes: Number(r.downvotes ?? 0),
    }));
  }
}

export default new ReviewRepository();
