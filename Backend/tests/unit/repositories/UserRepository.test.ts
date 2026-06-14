import UserRepository from "../../../src/repositories/UserRepository";
import { User } from "../../../src/models/User";

// Mock del modello Sequelize
jest.mock("../../../src/models/User");

describe("UserRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("dovrebbe chiamare save() e restituire l'utente", async () => {
      const mockUser = { save: jest.fn().mockResolvedValue(undefined) } as unknown as User;

      const result = await UserRepository.create(mockUser);

      expect(mockUser.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUser);
    });

    it("dovrebbe propagare un errore se save() fallisce", async () => {
      const mockUser = { save: jest.fn().mockRejectedValue(new Error("DB error")) } as unknown as User;

      await expect(UserRepository.create(mockUser)).rejects.toThrow("DB error");
      expect(mockUser.save).toHaveBeenCalledTimes(1);
    });

    it("dovrebbe funzionare anche se l'utente ha già campi settati", async () => {
      const mockUser = {
        id: 1,
        username: "test",
        email: "test@example.com",
        save: jest.fn().mockResolvedValue(undefined),
      } as unknown as User;

      const result = await UserRepository.create(mockUser);

      expect(result.id).toBe(1);
      expect(result.username).toBe("test");
      expect(result.email).toBe("test@example.com");
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe("findByEmail", () => {
    it("dovrebbe restituire l'utente se trovato", async () => {
      const fakeUser = { id: 1, email: "test@example.com" } as User;
      (User.findOne as jest.Mock).mockResolvedValue(fakeUser);

      const result = await UserRepository.findByEmail("test@example.com");

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: "test@example.com" } });
      expect(result).toBe(fakeUser);
    });

    it("dovrebbe restituire null se non trovato", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await UserRepository.findByEmail("notfound@example.com");

      expect(User.findOne).toHaveBeenCalledWith({ where: { email: "notfound@example.com" } });
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(UserRepository.findByEmail("fail@example.com")).rejects.toThrow("DB error");
      expect(User.findOne).toHaveBeenCalledWith({ where: { email: "fail@example.com" } });
    });
  });

  describe("findByUsername", () => {
    it("dovrebbe restituire l'utente se trovato", async () => {
      const fakeUser = { id: 1, username: "testuser" } as User;
      (User.findOne as jest.Mock).mockResolvedValue(fakeUser);

      const result = await UserRepository.findByUsername("testuser");

      expect(User.findOne).toHaveBeenCalledWith({ where: { username: "testuser" } });
      expect(result).toBe(fakeUser);
    });

    it("dovrebbe restituire null se non trovato", async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const result = await UserRepository.findByUsername("ghost");

      expect(User.findOne).toHaveBeenCalledWith({ where: { username: "ghost" } });
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (User.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(UserRepository.findByUsername("failuser")).rejects.toThrow("DB error");
      expect(User.findOne).toHaveBeenCalledWith({ where: { username: "failuser" } });
    });
  });

  describe("findById", () => {
    it("dovrebbe restituire l'utente se trovato", async () => {
      const fakeUser = { id: 1, username: "foundUser" } as User;
      (User.findByPk as jest.Mock).mockResolvedValue(fakeUser);

      const result = await UserRepository.findById(1);

      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(result).toBe(fakeUser);
    });

    it("dovrebbe restituire null se l'utente non esiste", async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await UserRepository.findById(999);

      expect(User.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (User.findByPk as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(UserRepository.findById(123)).rejects.toThrow("DB error");
      expect(User.findByPk).toHaveBeenCalledWith(123);
    });
  });

  describe("update", () => {
    it("dovrebbe restituire null se l'utente non esiste", async () => {
      (User.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await UserRepository.update({ id: 999 } as User);

      expect(User.findByPk).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });

    it("dovrebbe aggiornare solo l'username", async () => {
      const existing = { id: 1, save: jest.fn().mockResolvedValue(undefined) } as any;
      (User.findByPk as jest.Mock).mockResolvedValue(existing);

      const result = await UserRepository.update({ id: 1, username: "newName" } as User);

      expect(existing.username).toBe("newName");
      expect(existing.save).toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("dovrebbe aggiornare più campi (username + password)", async () => {
      const existing = { id: 1, save: jest.fn().mockResolvedValue(undefined) } as any;
      (User.findByPk as jest.Mock).mockResolvedValue(existing);

      const result = await UserRepository.update({
        id: 1,
        username: "newUser",
        password: "newPass",
      } as User);

      expect(existing.username).toBe("newUser");
      expect(existing.password).toBe("newPass");
      expect(existing.save).toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("dovrebbe aggiornare tutti i campi", async () => {
      const existing = { id: 1, save: jest.fn().mockResolvedValue(undefined) } as any;
      (User.findByPk as jest.Mock).mockResolvedValue(existing);

      const result = await UserRepository.update({
        id: 1,
        username: "fullUser",
        password: "fullPass",
        icon_id: 77,
      } as User);

      expect(existing.username).toBe("fullUser");
      expect(existing.password).toBe("fullPass");
      expect(existing.icon_id).toBe(77);
      expect(existing.save).toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it("dovrebbe propagare un errore se save fallisce", async () => {
      const existing = { id: 1, save: jest.fn().mockRejectedValue(new Error("DB error")) } as any;
      (User.findByPk as jest.Mock).mockResolvedValue(existing);

      await expect(UserRepository.update({ id: 1, username: "fail" } as User)).rejects.toThrow("DB error");
      expect(existing.save).toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("dovrebbe restituire true se l'utente è stato eliminato", async () => {
      (User.destroy as jest.Mock).mockResolvedValue(1);

      const result = await UserRepository.delete(1);

      expect(User.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(true);
    });

    it("dovrebbe restituire false se nessun utente è stato eliminato", async () => {
      (User.destroy as jest.Mock).mockResolvedValue(0);

      const result = await UserRepository.delete(999);

      expect(User.destroy).toHaveBeenCalledWith({ where: { id: 999 } });
      expect(result).toBe(false);
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (User.destroy as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(UserRepository.delete(123)).rejects.toThrow("DB error");
      expect(User.destroy).toHaveBeenCalledWith({ where: { id: 123 } });
    });
  });
});
