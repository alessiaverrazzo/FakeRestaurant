import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/sequelize";
import { verifyPassword } from "../utils/hash";

/**
 * Attributi che definiscono la struttura dati di un utente.
 * Mappa le colonne della tabella 'users'.
 */
interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string; // hashata
  icon_id: number;
}

/**
 * Attributi opzionali durante la creazione di un nuovo utente.
 * 'id' è autoincrementale, quindi opzionale.
 */
type UserCreationAttributes = Optional<UserAttributes, "id">;

/**
 * Modello Sequelize per gli utenti.
 * Rappresenta un utente registrato nel sistema.
 * Include metodi di utilità per la verifica della password e l'aggiornamento del profilo.
 */
export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public icon_id!: number;

  /**
   * Verifica se la password in chiaro fornita corrisponde all'hash salvato nel database.
   * Utilizza bcrypt per il confronto sicuro.
   *
   * @param inputPassword La password inserita dall'utente.
   * @returns True se la password è corretta, False altrimenti.
   */
  async checkPassword(inputPassword: string): Promise<boolean> {
    return await verifyPassword(inputPassword, this.password);
  }

  /**
   * Aggiorna l'ID dell'icona associata all'utente.
   * Non salva automaticamente nel DB, richiede una chiamata a .save().
   *
   * @param newIconId Il nuovo ID dell'icona.
   */
  updateIcon(newIconId: number) {
    this.icon_id = newIconId;
  }
}

/**
 * Inizializzazione del modello User.
 * Configura i tipi di dato, le validazioni (es. email) e le opzioni della tabella.
 */
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    icon_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: false, 
  }
);

export default User;