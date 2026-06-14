import bcrypt from 'bcrypt';

/**
 * Numero di round di salting per l'hashing della password.
 * Un valore più alto aumenta la sicurezza ma rallenta il processo di hashing.
 * 12 è considerato un buon compromesso tra sicurezza e prestazioni.
 */
const SALT_ROUNDS = 12;

/**
 * Genera un hash sicuro per una password utilizzando l'algoritmo bcrypt.
 *
 * @param password La password in chiaro da hashare.
 * @returns Una promessa che si risolve con la stringa hashata.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verifica se una password in chiaro corrisponde a un hash salvato.
 *
 * @param password La password in chiaro fornita dall'utente.
 * @param hashed L'hash della password salvato nel database.
 * @returns Una promessa che si risolve con true se corrispondono, false altrimenti.
 */
export const verifyPassword = async (password: string, hashed: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashed);
};
