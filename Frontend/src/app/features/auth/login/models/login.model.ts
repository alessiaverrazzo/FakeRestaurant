/**
 * Modello dati per la richiesta di Login.
 * Contiene le credenziali (identificativo e password) inviate al backend per l'autenticazione.
 */
export interface LoginRequest {
  /**
   * Identificativo dell'utente.
   * Può corrispondere allo username o all'indirizzo email.
   */
  identifier: string;
  /** Password dell'utente. */
  password: string;
}
