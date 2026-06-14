import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

/**
 * Attributi che definiscono la struttura dati di un voto per una recensione.
 * Mappa le colonne della tabella 'review_votes'.
 */
interface VoteReviewAttributes {
  id: number;
  user_id: number;
  review_id: number;
  vote: number; // Valore del voto: +1 (positivo) o -1 (negativo)
  created_at: Date;
}

/**
 * Attributi opzionali durante la creazione.
 * 'id' è autoincrementale, 'created_at' ha un default.
 */
interface VoteReviewCreationAttributes
  extends Optional<VoteReviewAttributes, 'id' | 'created_at' > {}

/**
 * Modello Sequelize per i voti delle recensioni.
 * Rappresenta l'apprezzamento (o meno) di un utente verso una recensione specifica.
 * Include vincoli per garantire che un utente possa votare una sola volta per recensione.
 */
export class VoteReview
  extends Model<VoteReviewCreationAttributes, VoteReviewCreationAttributes>
  implements VoteReviewCreationAttributes
{
  public id!: number;
  public user_id!: number;
  public review_id!: number;
  public vote!: number;
  public created_at!: Date;
}

/**
 * Inizializzazione del modello VoteReview.
 * Configura i tipi di dato, le validazioni (solo -1 o +1) e gli indici univoci.
 */
VoteReview.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    review_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    vote: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        isIn: [[-1, 1]], // Accetta solo valori -1 o +1
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'review_votes',
    timestamps: false, // created_at gestito a mano o con trigger
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'review_id'], // Vincolo di unicità: un utente non può votare due volte la stessa recensione
      },
    ],
  }
);

export default VoteReview;
