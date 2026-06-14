import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/user.model';
import { Notification } from '../models/notification.model';

/**
 * Gestore dello stato globale dell'applicazione (State Management).
 * Utilizza i Signals di Angular per gestire in modo reattivo:
 * - Utente corrente (sessione)
 * - Stato di caricamento globale
 * - Notifiche in tempo reale
 * - Animazioni UI (es. campanella notifiche)
 */
@Injectable({
  providedIn: 'root',
})
export class AppState {

  // Signals privati per lo stato interno
  private readonly userSignal = signal<User | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly notificationsSignal = signal<Notification[]>([]);

  /** Signal per gestire l'animazione della campanella notifiche nella UI. */
  readonly bellAnimate = signal(false);

  // Computed signals esposti pubblicamente (read-only)

  /** L'utente attualmente loggato, o null se non autenticato. */
  readonly user = computed(() => this.userSignal());

  /** Flag che indica se l'utente è autenticato. */
  readonly isLoggedIn = computed(() => !!this.userSignal());

  /** Flag globale di caricamento */
  readonly isLoading = computed(() => this.loadingSignal());

  /** Lista reattiva delle notifiche correnti. */
  readonly notifications = this.notificationsSignal;

  /** Conteggio delle notifiche non lette. */
  readonly unreadCount = computed(() =>
    this.notificationsSignal().filter(n => !n.isRead).length
  );

  /**
   * Imposta l'utente corrente (login/logout).
   * @param user L'oggetto utente o null per il logout.
   */
  setUser(user: User | null): void {
    this.userSignal.set(user);
  }

  /**
   * Aggiorna parzialmente i dati dell'utente corrente.
   * Utile per aggiornamenti profilo senza ricaricare tutto l'oggetto.
   * @param partial Oggetto con i campi da aggiornare.
   */
  patchUser(partial: Partial<User>): void {
    const current = this.userSignal();
    if (!current) return;

    this.userSignal.set({
      ...current,
      ...partial,
    });
  }

  /**
   * Imposta lo stato di caricamento globale.
   * @param value true per mostrare lo spinner, false per nasconderlo.
   */
  setLoading(value: boolean): void {
    this.loadingSignal.set(value);
  }

  /**
   * Sostituisce l'intera lista delle notifiche.
   * @param list La nuova lista di notifiche.
   */
  setNotifications(list: Notification[]): void {
    this.notificationsSignal.set(list);
  }

  /**
   * Attiva l'animazione della campanella notifiche.
   * Resetta il signal e lo reimposta per garantire il trigger dell'effetto CSS.
   */
  private triggerBellAnimation(): void {
    this.bellAnimate.set(false);
    // Riavvia l'animazione anche se è già attiva
    setTimeout(() => this.bellAnimate.set(true), 0);
  }

  /**
   * Aggiunge una nuova notifica in cima alla lista (realtime).
   * Calcola se la notifica è "nuova" (meno di 1 minuto) per evidenziarla.
   * @param notification La notifica da aggiungere.
   */
  addNotification(notification: Notification): void {
    const now = Date.now();
    const created = new Date(notification.createdAt).getTime();
    const isNew = now - created < 60_000; // 1 minuto

    this.notificationsSignal.update(prev => [
      { ...notification, isNew },
      ...prev
    ]);

    this.triggerBellAnimation();
  }

  /**
   * Segna una specifica notifica come letta localmente.
   * @param id ID della notifica.
   */
  markNotificationAsRead(id: number): void {
    this.notificationsSignal.update(prev =>
      prev.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      )
    );
  }

  /**
   * Segna tutte le notifiche correnti come lette localmente.
   */
  markAllNotificationsAsRead(): void {
    this.notificationsSignal.update(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    );
  }

  /**
   * Rimuove una notifica dalla lista locale.
   * @param id ID della notifica da rimuovere.
   */
  removeNotification(id: number): void {
    this.notificationsSignal.update(prev =>
      prev.filter(n => n.id !== id)
    );
  }

  /**
   * Resetta completamente lo stato dell'applicazione.
   * Da chiamare al logout per pulire dati sensibili e cache UI.
   */
  reset(): void {
    this.userSignal.set(null);
    this.loadingSignal.set(false);
    this.notificationsSignal.set([]);
  }
}
