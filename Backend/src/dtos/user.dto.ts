/**
 * DTO (Data Transfer Object) per la registrazione di un nuovo utente.
 * Contiene tutti i dati necessari per creare un account.
 */
export class RegisterDTO {
  username: string;
  email: string;
  password: string;
  /** ID dell'icona profilo scelta (valore atteso tra 1 e 15) */
  icon_id: number;

  constructor(data: { username: string; email: string; password: string; icon_id: number }) {
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.icon_id = data.icon_id;
  }
}

/**
 * DTO per il login utente.
 */
export class LoginDTO {
  /** Identificativo utente: può essere lo username o l'email */
  identifier: string;
  password: string;

  constructor(data: { identifier: string; password: string }) {
    this.identifier = data.identifier;
    this.password = data.password;
  }
}

/**
 * DTO per l'esposizione dei dati utente.
 * Utilizzato per inviare al frontend le informazioni del profilo, escludendo dati sensibili come la password.
 */
export class UserDTO {
  id: number;
  username: string;
  email: string;
  /** ID dell'icona profilo */
  icon_id: number;   

  constructor(data: { id: number; username: string; email: string; icon_id: number }) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.icon_id = data.icon_id;
  }
}

/**
 * DTO per la risposta di autenticazione.
 * Restituisce i dati dell'utente loggato e il token JWT per le richieste successive.
 */
export class AuthResponseDTO {
  user: UserDTO;
  /** Token JWT (Bearer) */
  token: string;

  constructor(user: UserDTO, token: string) {
    this.user = user;
    this.token = token;
  }
}

/**
 * DTO per l'aggiornamento dei dati utente.
 * Tutti i campi sono opzionali eccetto l'ID, permettendo aggiornamenti parziali (PATCH).
 */
export class UpdateUserDTO {
  id: number;
  /** Nuovo username (opzionale) */
  username?: string;
  /** Nuovo ID icona (opzionale) */
  icon_id?: number;
  /** Nuova password (opzionale) */
  password?: string;

  constructor(data: { id: number; username?: string; icon_id?: number; password?: string }) {
    this.id = data.id;

    if (data.username)
      this.username = data.username;

    if (data.icon_id !== undefined)
      this.icon_id = data.icon_id;

    if (data.password)
      this.password = data.password;
  }
}
