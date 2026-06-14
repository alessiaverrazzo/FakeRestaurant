/**
 * DTO (Data Transfer Object) per la richiesta di reset della password.
 * Contiene il token di verifica e la nuova password scelta dall'utente.
 */
export interface PasswordResetDTO {
  /** Token univoco di verifica inviato via email */
  token: string;
  /** Nuova password inserita dall'utente */
  password: string;
}
