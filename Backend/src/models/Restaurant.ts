import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import User from './User';


/**
 * Attributi che definiscono la struttura dati di un ristorante.
 * Mappa le colonne della tabella 'restaurants'.
 */
interface RestaurantAttributes {
  id: number;
  user_id: number;
  name: string;
  description: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  created_at: Date;
}

/**
 * Attributi opzionali durante la creazione di una nuova istanza.
 * 'id' è autoincrementale, 'created_at' ha un default, 'image_url' è opzionale.
 */
interface RestaurantCreationAttributes extends Optional<RestaurantAttributes, 'id' | 'created_at' | 'image_url'> {}


/**
 * Modello Sequelize per i ristoranti.
 * Rappresenta un'attività commerciale gestita da un utente (owner).
 * Contiene informazioni geografiche (latitudine, longitudine) per la localizzazione.
 */
export class Restaurant extends Model<RestaurantAttributes, RestaurantCreationAttributes> implements RestaurantAttributes {
  public id!: number;
  public user_id!: number;
  public name!: string;
  public description!: string;
  public image_url!: string;
  public latitude!: number;
  public longitude!: number;
  public created_at!: Date;

  public owner?: User;
}

/**
 * Inizializzazione del modello Restaurant.
 * Configura lo schema della tabella e le opzioni di Sequelize.
 */
Restaurant.init(
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'restaurants',
    timestamps: false,
  }
);

export default Restaurant;
