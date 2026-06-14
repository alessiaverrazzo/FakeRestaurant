import { User } from "../../../src/models/User";
import * as hashUtils from "../../../src/utils/hash";

// Mock del modulo hash per isolare i test del modello dalle dipendenze esterne
jest.mock("../../../src/utils/hash");

describe("Modello User - Metodi personalizzati", () => {

  describe("checkPassword", () => {
    test("dovrebbe delegare la verifica a verifyPassword", async () => {
      // Creazione di un'istanza mock dell'utente con dati fittizi
      const mockUser = new User({
        id: 1,
        username: "test",
        email: "test@example.com",
        password: "hashed_pw",
        icon_id: 1
      });

      // Creazione di una spia (spy) sulla funzione verifyPassword per controllarne l'esecuzione
      const spy = jest
        .spyOn(hashUtils, "verifyPassword")
        .mockResolvedValue(true);

      // Esecuzione del metodo da testare
      const result = await mockUser.checkPassword("secret");

      // Verifica che la funzione di utilità sia stata chiamata con i parametri corretti
      expect(spy).toHaveBeenCalledWith("secret", "hashed_pw");
      // Verifica che il risultato sia quello atteso
      expect(result).toBe(true);
    });
  });

  describe("updateIcon", () => {
    test("dovrebbe aggiornare l'id dell'icona", () => {
      // Creazione di un'istanza mock dell'utente
      const mockUser = new User({
        id: 1,
        username: "abc",
        email: "a@b.com",
        password: "pw",
        icon_id: 1
      });

      // Esecuzione del metodo per aggiornare l'icona
      mockUser.updateIcon(10);

      // Verifica che la proprietà dell'oggetto sia stata modificata
      expect(mockUser.icon_id).toBe(10);
    });
  });
});
