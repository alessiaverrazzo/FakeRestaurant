/**
 * Classe personalizzata per la gestione degli errori nell'applicazione.
 * Estende la classe nativa Error aggiungendo un codice di stato HTTP (es. 404, 500).
 * Questo permette di lanciare errori con informazioni specifiche per la risposta API.
 */
export class AppError extends Error {
  status: number;

  /**
   * Crea una nuova istanza di AppError.
   * @param message Messaggio descrittivo dell'errore.
   * @param status Codice di stato HTTP associato all'errore.
   */
  constructor(message: string, status: number) {
    super(message);
    this.status = status;

    // Mantiene il prototype corretto in TypeScript
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
