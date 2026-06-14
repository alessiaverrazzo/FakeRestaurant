import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";

/**
 * Attributi per il modello PasswordReset.
 * Rappresenta la struttura della tabella 'password_reset_tokens'.
 */
interface PasswordResetAttributes {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
}

/**
 * Attributi opzionali per la creazione di un nuovo token.
 * 'id' è autoincrementale e 'expires_at' ha un valore di default (10 minuti).
 */
interface PasswordResetCreationAttributes
  extends Optional<PasswordResetAttributes, "id" | "expires_at"> {}

/**
 * Modello Sequelize per la gestione dei token di reset password.
 * Ogni token è collegato a un utente e ha una scadenza temporale.
 */
export class PasswordReset
  extends Model<PasswordResetAttributes, PasswordResetCreationAttributes>
  implements PasswordResetAttributes
{
  public id!: number;
  public user_id!: number;
  public token!: string;
  public expires_at!: Date;
}

/**
 * Inizializzazione del modello PasswordReset.
 */
PasswordReset.init(
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
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      // Imposta la scadenza a 10 minuti dal momento della creazione
      defaultValue: sequelize.literal("NOW() + INTERVAL '10 minutes'")
    },
  },
  {
    tableName: "password_reset_tokens",
    sequelize,
    timestamps: false,
    underscored: true,
  }
);
