/**
 * Modello dati per un Utente.
 * Rappresenta le informazioni di base di un utente registrato nel sistema.
 */
export interface User {
  id: number;
  username: string;
  email: string;
  /** ID dell'icona del profilo selezionata dall'utente. */
  iconId: number;
}
