import { hashPassword, verifyPassword } from "../../../src/utils/hash";
import bcrypt from "bcrypt";

jest.mock("bcrypt");

describe("hash utils", () => {
  beforeEach(() => jest.clearAllMocks());

  // =========================
  // HASH PASSWORD
  // =========================
  it("dovrebbe hashare la password con 12 salt rounds", async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");

    const result = await hashPassword("mypassword");

    expect(bcrypt.hash).toHaveBeenCalledWith("mypassword", 12);
    expect(result).toBe("hashedPassword");
  });

  // =========================
  // VERIFY PASSWORD
  // =========================
  it("dovrebbe verificare la password", async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await verifyPassword("mypassword", "hashedPassword");

    expect(bcrypt.compare).toHaveBeenCalledWith("mypassword", "hashedPassword");
    expect(result).toBe(true);
  });

  // =========================
  // OPTIONAL: test errori
  // =========================
  it("dovrebbe propagare errori di bcrypt.hash", async () => {
    (bcrypt.hash as jest.Mock).mockRejectedValue(new Error("Hash error"));

    await expect(hashPassword("x")).rejects.toThrow("Hash error");
  });

  it("dovrebbe propagare errori di bcrypt.compare", async () => {
    (bcrypt.compare as jest.Mock).mockRejectedValue(new Error("Compare error"));

    await expect(verifyPassword("x", "y")).rejects.toThrow("Compare error");
  });
});
