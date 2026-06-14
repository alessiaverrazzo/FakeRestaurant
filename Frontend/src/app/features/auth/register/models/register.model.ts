/**
 * Modello dati per la richiesta di Registrazione.
 * Contiene le informazioni necessarie per creare un nuovo account utente.
 */
export interface RegisterRequest {
  /** Nome utente scelto. */
  username: string;
  /** Indirizzo email dell'utente. */
  email: string;
  /** Password scelta dall'utente. */
  password: string;
  /** ID dell'icona del profilo selezionata. */
  icon_id: number;
}
