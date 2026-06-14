import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SocketService } from '@core/services/socket.service';

// Mock della socket.io-client
const socketOnHandlers: Record<string, Function> = {};

class FakeSocket {
  connected = false;

  constructor() {}

  on(event: string, handler: Function) {
    socketOnHandlers[event] = handler;
  }

  emitEvent(event: string, payload?: any) {
    if (socketOnHandlers[event]) socketOnHandlers[event](payload);
  }

  disconnect() {
    this.connected = false;
  }
}

vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => {
      const s = new FakeSocket();
      // Simuliamo connessione immediata
      s.connected = true;
      return s;
    })
  };
});

// Mock fetch()
globalThis.fetch = vi.fn();

// Mock AppState
const mockNotifications: any[] = [];

const mockAppState = {
  notifications: vi.fn(() => mockNotifications),
  addNotification: vi.fn((n) => mockNotifications.push(n)),
  removeNotification: vi.fn((id) => {
    const idx = mockNotifications.findIndex(n => n.id === id);
    if (idx >= 0) mockNotifications.splice(idx, 1);
  })
};

// Mock NotificationService
const mockNotificationService = {
  mapNotificationFromBackend: vi.fn((n) => n)
};

describe('SocketService — test principali', () => {
  let service: SocketService;

  beforeEach(() => {
    // Reset
    mockNotifications.length = 0;

    for (const k in socketOnHandlers) delete socketOnHandlers[k];

    (globalThis.fetch as any).mockReset();
    mockAppState.notifications.mockClear();
    mockAppState.addNotification.mockClear();
    mockAppState.removeNotification.mockClear();
    mockNotificationService.mapNotificationFromBackend.mockClear();

    service = new SocketService(
      mockAppState as any,
      mockNotificationService as any
    );
  });

  describe('connect', () => {
    it('non deve connettere se userId invalido', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.connect(0);
      expect(warn).toHaveBeenCalled();
      expect(service.isConnected()).toBe(false);

      warn.mockRestore();
    });

    it('chiama io() e registra eventi', () => {
      service.connect(5);
      expect(service.isConnected()).toBe(true);

      // Eventi registrati
      expect(Object.keys(socketOnHandlers).length).toBeGreaterThan(0);
    });

    it('disconnette e resetta la vecchia socket se esiste ma non è connessa', () => {
      // socket finta già esistente e NON connessa
      const fakeOldSocket = {
        connected: false,
        disconnect: vi.fn(),
      };

      (service as any).socket = fakeOldSocket;

      service.connect(5);

      expect(fakeOldSocket.disconnect).toHaveBeenCalled();
      expect((service as any).socket).not.toBe(fakeOldSocket); // è stata rimpiazzata
    });

    it('non deve riconnettere se la socket è già connessa', () => {
      const fakeSocket = {
        connected: true,
        disconnect: vi.fn(),
      };

      (service as any).socket = fakeSocket;

      service.connect(5);

      // non deve disconnettere né creare una nuova socket
      expect(fakeSocket.disconnect).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('disconnect', () => {
    it('disconnette e resetta i valori', () => {
      service.connect(5);
      expect(service.isConnected()).toBe(true);

      service.disconnect();

      expect(service.isConnected()).toBe(false);
      expect((service as any).socket).toBeNull();
      expect((service as any).userId).toBeNull();
    });
  });

  // ----------------------------------------------------------------
  describe('isConnected', () => {
    it('ritorna true solo se socket connesso', () => {
      expect(service.isConnected()).toBe(false);
      service.connect(5);
      expect(service.isConnected()).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  describe('eventi di connessione base', () => {
    it('logga connect/disconnect/connect_error', () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      service.connect(5);

      socketOnHandlers['connect']?.();
      expect(info).toHaveBeenCalledWith('[Socket] Connected');

      socketOnHandlers['disconnect']?.();
      expect(info).toHaveBeenCalledWith('[Socket] Disconnected');

      socketOnHandlers['connect_error']?.();
      expect(warn).toHaveBeenCalledWith('[Socket] Connection error');

      info.mockRestore();
      warn.mockRestore();
    });

    it('registerEvents non fa nulla se socket è null', () => {
      // chiamata diretta
      expect(() => (service as any).registerEvents()).not.toThrow();
    });
  });

  // ----------------------------------------------------------------
  describe('event: notification', () => {
    it('ignora payload non validi', async () => {
      service.connect(10);

      socketOnHandlers['notification']?.(null);
      socketOnHandlers['notification']?.({ invalid: true });

      expect(mockAppState.addNotification).not.toHaveBeenCalled();
    });

    it('aggiunge notifica mappata se valida', async () => {
      service.connect(10);

      mockNotificationService.mapNotificationFromBackend.mockReturnValue({
        id: 1,
        type: 'upvote',
        actorId: 5,
      });

      (globalThis.fetch as any).mockResolvedValue({
        json: async () => ({ username: 'TestUser' })
      });

      await socketOnHandlers['notification']?.({
        id: 1,
        type: 'upvote',
        actorId: 5
      });

      expect(mockAppState.addNotification).toHaveBeenCalledTimes(1);
      expect(mockNotifications[0].actorUsername).toBe('TestUser');
    });

    it('non aggiunge duplicati', async () => {
      service.connect(10);

      mockNotifications.push({ id: 1 });

      mockNotificationService.mapNotificationFromBackend.mockReturnValue({
        id: 1,
        type: 'upvote',
        actorId: 5
      });

      await socketOnHandlers['notification']?.({
        id: 1,
        type: 'upvote',
        actorId: 5
      });

      expect(mockAppState.addNotification).not.toHaveBeenCalled();
    });

    it('notification: gestisce errori nel mapping (branch catch)', async () => {
      service.connect(10);

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockNotificationService.mapNotificationFromBackend.mockImplementation(() => {
        throw new Error('mapping failed');
      });

      await socketOnHandlers['notification']?.({
        id: 1,
        type: 'upvote'
      });

      expect(warn).toHaveBeenCalled();
      expect(mockAppState.addNotification).not.toHaveBeenCalled();

      warn.mockRestore();
    });

    it('notification: catch del fetch fallito', async () => {
      service.connect(10);

      mockNotificationService.mapNotificationFromBackend.mockReturnValue({
        id: 1,
        type: 'upvote',
        actorId: 5,
      });

      (globalThis.fetch as any).mockRejectedValue(new Error('network error'));

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await socketOnHandlers['notification']?.({
        id: 1,
        type: 'upvote',
        actorId: 5
      });

      expect(warn).toHaveBeenCalledWith(
        '[Socket] Username fetch failed, fallback to "Qualcuno"'
      );

      warn.mockRestore();
    });

    it('ignora notification con type non stringa', async () => {
      service.connect(10);

      await socketOnHandlers['notification']?.({
        id: 1,
        type: 123,
      });

      expect(mockAppState.addNotification).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('event: notification:new', () => {
    it('aggiunge notifica nuova e recupera username', async () => {
      service.connect(10);

      mockNotificationService.mapNotificationFromBackend.mockReturnValue({
        id: 2,
        type: 'reply',
        actorId: 7,
      });

      (globalThis.fetch as any).mockResolvedValue({
        json: async () => ({ username: 'AnotherUser' })
      });

      await socketOnHandlers['notification:new']?.({
        id: 2,
        type: 'reply',
        actorId: 7
      });

      expect(mockAppState.addNotification).toHaveBeenCalledTimes(1);
      expect(mockNotifications[0].actorUsername).toBe('AnotherUser');
      expect(mockNotifications[0].isNew).toBe(true);
    });

    it('ignora duplicati', async () => {
      service.connect(10);

      mockNotifications.push({ id: 2 });

      mockNotificationService.mapNotificationFromBackend.mockReturnValue({
        id: 2,
        type: 'reply',
      });

      await socketOnHandlers['notification:new']?.({ id: 2 });

      expect(mockAppState.addNotification).not.toHaveBeenCalled();
    });

    it('notification:new: catch mapping fallito', async () => {
      service.connect(10);

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockNotificationService.mapNotificationFromBackend.mockImplementation(() => {
        throw new Error('mapping fail');
      });

      await socketOnHandlers['notification:new']?.({ id: 1 });

      expect(warn).toHaveBeenCalled();

      warn.mockRestore();
    });

    it('notification:new: catch del fetch fallito', async () => {
      service.connect(10);

      mockNotificationService.mapNotificationFromBackend.mockReturnValue({
        id: 3,
        type: 'reply',
        actorId: 9,
      });

      (globalThis.fetch as any).mockRejectedValue(new Error('fetch error'));

      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await socketOnHandlers['notification:new']?.({
        id: 3,
        type: 'reply',
        actorId: 9
      });

      expect(warn).toHaveBeenCalledWith(
        '[Socket:new] Username fetch failed, fallback to "Qualcuno"'
      );

      warn.mockRestore();
    });

    it('ignora notification:new con payload non valido', async () => {
      service.connect(10);

      await socketOnHandlers['notification:new']?.(null);
      await socketOnHandlers['notification:new']?.('invalid');

      expect(mockAppState.addNotification).not.toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------------
  describe('event: notification:deleted', () => {
    it('rimuove la notifica se id valido', () => {
      service.connect(10);

      mockNotifications.push({ id: 10 });

      socketOnHandlers['notification:deleted']?.({ id: 10 });

      expect(mockAppState.removeNotification).toHaveBeenCalledWith(10);
      expect(mockNotifications.length).toBe(0);
    });

    it('ignora id non validi', () => {
      service.connect(10);

      socketOnHandlers['notification:deleted']?.({ id: null });
      socketOnHandlers['notification:deleted']?.({ id: 'ciao' });

      expect(mockAppState.removeNotification).not.toHaveBeenCalled();
    });
  });
});
