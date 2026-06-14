import PasswordResetRepository from "../../../src/repositories/PasswordResetRepository";
import { PasswordReset } from "../../../src/models/PasswordReset";
import { v4 as uuidv4 } from "uuid";
import { Op, Sequelize } from "sequelize";

// Mock del modello Sequelize
jest.mock("../../../src/models/PasswordReset");
jest.mock("uuid");

describe("PasswordResetRepository", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("dovrebbe creare un token e restituirlo", async () => {
      const fakeUuid = "123e4567-e89b-12d3-a456-426614174000";
      (uuidv4 as jest.Mock).mockReturnValue(fakeUuid);
      (PasswordReset.create as jest.Mock).mockResolvedValue({});

      const token = await PasswordResetRepository.create(42);

      expect(uuidv4).toHaveBeenCalledTimes(1);
      expect(PasswordReset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 42,
          token: fakeUuid,
          expires_at: expect.any(Date),
        })
      );
      expect(token).toBe(fakeUuid);
    });

    it("dovrebbe propagare un errore se la creazione fallisce", async () => {
      const fakeUuid = "123e4567-e89b-12d3-a456-426614174000";
      (uuidv4 as jest.Mock).mockReturnValue(fakeUuid);
      (PasswordReset.create as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(PasswordResetRepository.create(42)).rejects.toThrow("DB error");

      expect(uuidv4).toHaveBeenCalledTimes(1);
      expect(PasswordReset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 42,
          token: fakeUuid,
          expires_at: expect.any(Date),
        })
      );
    });

    it("dovrebbe restituire una stringa UUID valida", async () => {
      const fakeUuid = "123e4567-e89b-12d3-a456-426614174000";
      (uuidv4 as jest.Mock).mockReturnValue(fakeUuid);
      (PasswordReset.create as jest.Mock).mockResolvedValue({});

      const token = await PasswordResetRepository.create(7);

      expect(typeof token).toBe("string");
      expect(token).toHaveLength(36);
    });
  });

  describe("findByToken", () => {
    it("dovrebbe restituire il record se il token esiste e non è scaduto", async () => {
      const fakeRecord = { token: "abc123", user_id: 1 } as PasswordReset;
      (PasswordReset.findOne as jest.Mock).mockResolvedValue(fakeRecord);

      const result = await PasswordResetRepository.findByToken("abc123");

      expect(PasswordReset.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            token: "abc123",
            expires_at: { [Op.gt]: Sequelize.literal("NOW()") },
          },
        })
      );
      expect(result).toBe(fakeRecord);
    });

    it("dovrebbe restituire null se il token non esiste o è scaduto", async () => {
      (PasswordReset.findOne as jest.Mock).mockResolvedValue(null);

      const result = await PasswordResetRepository.findByToken("nonexistent");

      expect(result).toBeNull();
      expect(PasswordReset.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            token: "nonexistent",
            expires_at: { [Op.gt]: Sequelize.literal("NOW()") },
          },
        })
      );
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (PasswordReset.findOne as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(PasswordResetRepository.findByToken("failtoken")).rejects.toThrow("DB error");

      expect(PasswordReset.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            token: "failtoken",
            expires_at: { [Op.gt]: Sequelize.literal("NOW()") },
          },
        })
      );
    });
  });

  describe("delete", () => {
    it("dovrebbe eliminare il token se esiste", async () => {
      (PasswordReset.destroy as jest.Mock).mockResolvedValue(1);

      await PasswordResetRepository.delete("abc123");

      expect(PasswordReset.destroy).toHaveBeenCalledWith({
        where: { token: "abc123" },
      });
    });

    it("dovrebbe comunque chiamare destroy anche se il token non esiste", async () => {
      (PasswordReset.destroy as jest.Mock).mockResolvedValue(0);

      await PasswordResetRepository.delete("nonexistent");

      expect(PasswordReset.destroy).toHaveBeenCalledWith({
        where: { token: "nonexistent" },
      });
    });

    it("dovrebbe propagare un errore se la query fallisce", async () => {
      (PasswordReset.destroy as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(PasswordResetRepository.delete("failtoken")).rejects.toThrow("DB error");

      expect(PasswordReset.destroy).toHaveBeenCalledWith({
        where: { token: "failtoken" },
      });
    });
  });
});
