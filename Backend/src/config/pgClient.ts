import { Client } from "pg";
import dotenv from "dotenv";

// Carica le variabili d'ambiente dal file .env
dotenv.config();

/**
 * Istanza del client PostgreSQL configurata con le variabili d'ambiente.
 * Viene utilizzata per gestire la connessione al database e le query.
 */
export const pgClient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

/**
 * Stabilisce la connessione al database PostgreSQL e attiva l'ascolto sul canale delle notifiche.
 * Questo permette all'applicazione di reagire a eventi in tempo reale inviati dal database (es. trigger).
 */
export const connectPgClient = async () => {
  await pgClient.connect();
  console.log("pgClient connesso — LISTEN attivo");

  // Attiva l'ascolto sul canale 'notifications_channel' per ricevere notifiche asincrone
  await pgClient.query("LISTEN notifications_channel");
};
