import app from "./app";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { connectDB, sequelize } from "./config/sequelize";
import { pgClient, connectPgClient } from "./config/pgClient";
import NotificationRepository from "./repositories/NotificationRepository";
import { NotificationDTO } from "./dtos/notification.dto";

// Import dei modelli per registrarli con Sequelize
import './models/User';
import './models/Restaurant';
import './models/Review';
import './models/VoteRestaurant';
import './models/VoteReview';
import './models/Notification';

// Associazioni
import './models/associations';


// ======================================================
// 1. CREA HTTP SERVER E SOCKET.IO
// ======================================================
const httpServer = http.createServer(app);

/**
 * Configurazione del server Socket.IO per la gestione delle comunicazioni in tempo reale.
 * Abilita CORS per permettere connessioni dal frontend (localhost:4200).
 */
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
  }
});

/**
 * Gestione degli eventi di connessione dei client Socket.IO.
 * Quando un utente si connette, viene aggiunto a una "room" specifica basata sul suo ID.
 */
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} connected to room user_${userId}`);
  }

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });
});

// ======================================================
//  LISTEN su PostgreSQL per notifiche DB
// ======================================================
/**
 * Ascolta le notifiche inviate dal database PostgreSQL tramite il canale 'notifications_channel'.
 * Questo meccanismo permette di aggiornare i client in tempo reale quando i dati cambiano nel DB.
 */
pgClient.on("notification", async (msg) => {
  const payload = msg.payload;

  if (!payload) return;

  // Il payload è atteso nel formato "action:id" (es. "insert:123")
  const [action, idStr] = payload.split(":");
  const notifId = Number(idStr);

  // Gestione evento di inserimento nuova notifica
  if (action === "insert") {
    const notif = await NotificationRepository.findById(notifId);
    if (!notif) return;

    const dto = new NotificationDTO({
      id: notif.id,
      user_id: notif.user_id,
      type: notif.type,
      actor_id: notif.actor_id,
      target_type: notif.target_type,
      target_id: notif.target_id,
      is_read: notif.is_read,
      created_at: notif.created_at,
      actor_username: notif.actor?.username ?? undefined,
      review_id: notif.review?.id ?? null,
      reply_id: notif.review?.parent_review_id ?? null,
      restaurant_id: notif.restaurant?.id ?? null
    });

    // Invia la notifica in tempo reale solo all'utente specifico tramite la sua room
    io.to(`user_${notif.user_id}`).emit("notification:new", dto);

    console.log("Inviata notification:new all'utente", notif.user_id);
  }

  // Gestione evento di cancellazione notifica
  if (action === "delete") {
    io.emit("notification:deleted", { id: notifId });
    console.log("Inviata notification:deleted id", notifId);
  }
});


// ======================================================
// 2. AVVIARE IL SERVER + DB
// ======================================================
const PORT = process.env.PORT || 3000;

/**
 * Funzione di avvio del server.
 * Stabilisce le connessioni al database, sincronizza i modelli ORM e avvia il server HTTP.
 */
const startServer = async () => {
  try {
    // Connessione al DB
    await connectDB();
    await connectPgClient();

    // Sincronizza i modelli con il DB
    await sequelize.sync();
    console.log("Modelli sincronizzati con il DB");

    // Avvia server HTTP
    httpServer.listen(PORT, () => {
      console.log(`Server + Socket.io attivi su http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Errore durante l'avvio del server:", error);
    process.exit(1);
  }
};

startServer();
