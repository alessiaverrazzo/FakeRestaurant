import { v4 as uuidv4 } from "uuid";
import { PasswordReset } from "../models/PasswordReset";
import { Op, Sequelize } from "sequelize";

/**
 * Repository per la gestione dei token di reset della password.
 * Si occupa della creazione, verifica e cancellazione dei token di sicurezza.
 */
class PasswordResetRepository {

  /**
   * Genera un nuovo token di reset password per un utente specifico.
   * Il token ha una validità di 10 minuti.
   * @param user_id ID dell'utente che ha richiesto il reset.
   * @returns Il token UUID generato.
   */
  async create(user_id: number): Promise<string> {
    const token = uuidv4();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minuti da ora

    await PasswordReset.create({
      user_id,
      token,
      expires_at: expires,
    });

    return token;
  }

  /**
   * Cerca un token nel database verificando che non sia scaduto.
   * Utilizza l'operatore 'greater than' (gt) rispetto al timestamp corrente del DB.
   * @param token La stringa del token da verificare.
   * @returns Il record del token se valido, altrimenti null.
   */
  async findByToken(token: string) {
    const record = await PasswordReset.findOne({
      where: {
        token,
        expires_at: { [Op.gt]: Sequelize.literal("NOW()") }, // solo token non scaduti
      },
    });

    return record;
  }

  /**
   * Elimina un token dal database.
   * Solitamente chiamato dopo che la password è stata resettata con successo.
   * @param token Il token da eliminare.
   */
  async delete(token: string): Promise<void> {
    await PasswordReset.destroy({ where: { token } });
  }
}

export default new PasswordResetRepository();
