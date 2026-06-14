/**
 * Modello dati per il token di reset della password.
 * Contiene le informazioni necessarie per identificare e validare una richiesta di recupero password.
 */
export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  /** Data di scadenza del token */
  expiresAt: string;
}
