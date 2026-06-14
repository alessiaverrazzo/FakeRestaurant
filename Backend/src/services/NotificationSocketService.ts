import { io } from "../server";

/**
 * Service dedicato alla gestione delle comunicazioni WebSocket per le notifiche.
 * Utilizza l'istanza globale di Socket.IO per inviare messaggi in tempo reale ai client connessi.
 * Questo permette di disaccoppiare la logica di invio socket dal resto dell'applicazione.
 */
class NotificationSocketService {
  /**
   * Invia un evento di notifica in tempo reale a uno specifico utente.
   * Utilizza il meccanismo delle "room" di Socket.IO: ogni utente è iscritto a una room "user_{id}".
   * @param userId ID dell'utente destinatario.
   * @param notification Il payload della notifica da inviare (solitamente un DTO o oggetto parziale).
   */
  sendToUser(userId: number, notification: any) {
    // Emette l'evento 'notification' solo ai socket connessi nella room dell'utente
    io.to(`user_${userId}`).emit("notification", notification);
  }
}

export const notificationSocketService = new NotificationSocketService();
