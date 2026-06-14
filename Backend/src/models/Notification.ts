import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/sequelize';
import Review from './Review';
import Restaurant from './Restaurant';
import User from "./User";

/**
 * Attributi di una notifica
 */
interface NotificationAttributes {
  id: number;
  user_id: number;      // ID dell'utente che riceve la notifica
  type: string;         // Tipo di evento (es. 'vote', 'reply')
  actor_id: number;     // ID dell'utente che ha generato l'evento
  target_type: string;  // Tipo dell'entità collegata ('review', 'restaurant')
  target_id: number;    // ID dell'entità collegata
  is_read: boolean;
  created_at: Date;
}

/**
 * Attributi opzionali per la creazione
 */
interface NotificationCreationAttributes
  extends Optional<NotificationAttributes, 'id' | 'is_read' | 'created_at'> {}

/**
 * Modello Sequelize per le notifiche.
 * Gestisce gli eventi che devono essere notificati agli utenti.
 * Utilizza un approccio polimorfico manuale (target_type + target_id) per
 * collegarsi a diverse entità (Recensioni, Ristoranti) senza chiavi esterne rigide.
 */
export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes {

  public id!: number;
  public user_id!: number;
  public type!: string;
  public actor_id!: number;
  public target_type!: string;
  public target_id!: number;
  public is_read!: boolean;
  public created_at!: Date;

  // Campi per le associazioni (popolati tramite include)
  public review?: Review | null;
  public restaurant?: Restaurant | null;
  public actor?: User | null;
}

/**
 * Inizializzazione del modello Notification.
 */
Notification.init(
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
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    actor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    target_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: false, // created_at è gestito manualmente o dal DB
  }
);

export default Notification;
