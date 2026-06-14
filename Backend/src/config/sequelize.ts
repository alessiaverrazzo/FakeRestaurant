import { Sequelize } from "sequelize";
import dotenv from "dotenv";

// Carica le variabili da .env
dotenv.config();

/**
 * Istanza di Sequelize configurata per la connessione al database PostgreSQL.
 * Utilizza le variabili d'ambiente per definire host, utente, password e nome del DB.
 * Questa istanza verrà utilizzata per definire i modelli e gestire le operazioni ORM.
 */
export const sequelize = new Sequelize(
  process.env.DB_NAME as string,
  process.env.DB_USER as string,
  process.env.DB_PASSWORD as string,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: "postgres",
    logging: false,
  }
);

/**
 * Tenta di autenticarsi al database per verificare che la connessione sia stabilita correttamente.
 * Se la connessione fallisce, l'applicazione viene terminata con un codice di errore per prevenire avvii instabili.
 */
export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connessione a PostgreSQL riuscita!");
  } catch (error) {
    console.error("Errore di connessione al DB:", error);
    process.exit(1);
  }
};
