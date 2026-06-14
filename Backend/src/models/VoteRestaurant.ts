import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';

/**
 * Attributi che definiscono la struttura dati di un voto per un ristorante.
 * Mappa le colonne della tabella 'restaurant_votes'.
 */
interface VoteRestaurantAttributes {
  id: number;
  user_id: number;
  restaurant_id: number;
  vote: number; // Valore del voto: +1 (positivo) o -1 (negativo)
  created_at: Date;
}

/**
 * Attributi opzionali durante la creazione.
 * 'id' è autoincrementale, 'created_at' ha un default.
 */
interface VoteRestaurantCreationAttributes
  extends Optional<VoteRestaurantAttributes, 'id' | 'created_at' > {}

/**
 * Modello Sequelize per i voti dei ristoranti.
 * Rappresenta l'apprezzamento (o meno) di un utente verso un ristorante.
 * Include vincoli per garantire che un utente possa votare una sola volta per ristorante.
 */
export class VoteRestaurant
  extends Model<VoteRestaurantAttributes, VoteRestaurantCreationAttributes>
  implements VoteRestaurantAttributes
{
  public id!: number;
  public user_id!: number;
  public restaurant_id!: number;
  public vote!: number;
  public created_at!: Date;
}

/**
 * Inizializzazione del modello VoteRestaurant.
 * Configura i tipi di dato, le validazioni (solo -1 o +1) e gli indici univoci.
 */
VoteRestaurant.init(
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
    restaurant_id: {
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
    tableName: 'restaurant_votes',
    timestamps: false, // created_at e updated_at gestiti a mano o con trigger
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'restaurant_id'], // Vincolo di unicità: un utente non può votare due volte lo stesso ristorante
      },
    ],
  }
);

export default VoteRestaurant;
