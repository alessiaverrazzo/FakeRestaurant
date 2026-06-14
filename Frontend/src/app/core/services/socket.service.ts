import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AppState } from '../state/app.state';
import { NotificationService } from '@core/services/notification.service';

/**
 * Servizio per la gestione della connessione WebSocket.
 * Gestisce la comunicazione in tempo reale per le notifiche utilizzando Socket.IO.
 * Si occupa di connettere, disconnettere e ascoltare gli eventi per aggiornare lo stato dell'app.
 */
@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket | null = null;
  private userId: number | null = null;

  constructor(
    private appState: AppState,
    private notificationService: NotificationService
  ) {}

  /**
   * Stabilisce una connessione WebSocket sicura per l'utente specificato.
   * Se esiste già una connessione attiva, viene mantenuta o riavviata se necessario.
   * @param userId L'ID dell'utente da connettere.
   */
  connect(userId: number): void {
    // Validazione e sanitizzazione
    if (typeof userId !== 'number' || Number.isNaN(userId) || userId <= 0) {
      console.warn('[Socket] Invalid userId, aborting connection.');
      return;
    }

    this.userId = userId;

    // Evita doppie connessioni
    if (this.socket?.connected) return;

    if (this.socket && !this.socket.connected) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Connessione sicura: userId solo come stringa "safe"
    const safeUserId = String(userId).replace(/[^0-9]/g, '');

    this.socket = io('http://localhost:3000', {
      query: { userId: safeUserId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });

    this.registerEvents();
  }

  /**
   * Registra i listener per gli eventi del socket (connessione, disconnessione, notifiche).
   * Gestisce la logica di ricezione delle notifiche, il recupero di dati mancanti (es. username)
   * e l'aggiornamento dello stato applicativo (AppState).
   */
  private registerEvents(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.info('[Socket] Connected');
    });

    this.socket.on('disconnect', () => {
      console.info('[Socket] Disconnected');
    });

    this.socket.on('connect_error', () => {
      console.warn('[Socket] Connection error');
    });

    // Gestione evento 'notification' (evento base o trigger generico)
    this.socket.on('notification', async (notif: any) => {
      if (!notif || typeof notif !== 'object') return;
      if (typeof notif.id !== 'number') return;
      if (typeof notif.type !== 'string') return;

      try {
        let mapped = this.notificationService.mapNotificationFromBackend(notif);

        // Se non c'è actorUsername nel payload, prova a recuperarlo
        if (!mapped.actorUsername && mapped.actorId) {
          try {
            const res = await fetch(`http://localhost:3000/users/${mapped.actorId}/username`);
            const data = await res.json();
            mapped = {
              ...mapped,
              actorUsername: data.username
            };
          } catch (err) {
            console.warn('[Socket] Username fetch failed, fallback to "Qualcuno"');
          }
        }

        // Evita duplicati controllando lo stato attuale
        const existing = this.appState.notifications();
        if (existing.some(n => n.id === mapped.id)) return;

        // Aggiungi la notifica allo stato
        this.appState.addNotification({
          ...mapped,
          isNew: true
        });

      } catch (e) {
        console.warn('[Socket] Invalid notification received, ignored.', e);
      }
    });

    // Gestione evento 'notification:new' (trigger specifico SQL)
    this.socket.on('notification:new', async (notif: any) => {
      if (!notif || typeof notif !== 'object') return;

      try {
        let mapped = this.notificationService.mapNotificationFromBackend(notif);

        // Recupera username se mancante
        if (!mapped.actorUsername && mapped.actorId) {
          try {
            const res = await fetch(`http://localhost:3000/users/${mapped.actorId}/username`);
            const data = await res.json();
            mapped = {
              ...mapped,
              actorUsername: data.username
            };
          } catch (err) {
            console.warn('[Socket:new] Username fetch failed, fallback to "Qualcuno"');
          }
        }

        // Evita duplicati
        const existing = this.appState.notifications();
        if (existing.some(n => n.id === mapped.id)) return;

        // Aggiungi notifica
        this.appState.addNotification({
          ...mapped,
          isNew: true
        });

      } catch (e) {
        console.warn('[Socket] Invalid notification:new received', e);
      }
    });

    // Gestione evento 'notification:deleted'
    this.socket.on('notification:deleted', ({ id }) => {
      if (!id || typeof id !== 'number') return;
      this.appState.removeNotification(id);
    });
  }

  /**
   * Verifica se il socket è attualmente connesso.
   * @returns true se connesso, false altrimenti.
   */
  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /**
   * Chiude la connessione WebSocket e resetta lo stato locale.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }
}
