/**
 * Stato del componente di modifica profilo.
 * Gestisce i dati del form, lo stato di caricamento, gli errori e la modale di eliminazione.
 */
export interface EditProfileState {
  /** Username attuale o modificato. */
  username: string;
  /** ID dell'icona selezionata. */
  icon_id: number;

  /** Nuova password */
  newPassword: string | null;
  /** Conferma della nuova password. */
  confirmPassword: string | null;

  /** Flag di caricamento per il salvataggio. */
  loading: boolean;

  /** Lista di messaggi di errore da mostrare. */
  errors: string[];
  /** Messaggio di successo dopo il salvataggio. */
  success: string | null;

  /** Flag per mostrare/nascondere la modale di conferma eliminazione account. */
  showDeleteModal: boolean;
  /** Flag che indica se l'eliminazione è avvenuta con successo. */
  deleteSuccess: boolean;
  /** Flag di caricamento per l'operazione di eliminazione. */
  deleteLoading: boolean;
}

/**
 * Dati inviati al backend per l'aggiornamento del profilo.
 * Tutti i campi sono opzionali perché l'utente può aggiornarne solo alcuni.
 */
export interface EditProfileData {
  username?: string;
  icon_id?: number;
  password?: string;
}
