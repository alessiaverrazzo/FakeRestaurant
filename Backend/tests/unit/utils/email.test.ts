describe("email utils", () => {
  let sendEmail: any;
  let nodemailer: any;

  const sendMailMock = jest.fn();

  beforeEach(async () => {
    jest.resetModules();

    jest.doMock("nodemailer", () => ({
      __esModule: true,
      default: {
        createTransport: jest.fn(() => ({
          sendMail: sendMailMock,
        })),
      },
    }));

    nodemailer = await import("nodemailer");
    sendEmail = (await import("../../../src/utils/email")).sendEmail;

    sendMailMock.mockReset();
  });

  it("dovrebbe inviare una email", async () => {
    sendMailMock.mockResolvedValue(true);

    await sendEmail({
      to: "test@example.com",
      subject: "Hello",
      text: "Test",
      html: "<p>Hello</p>",
    });

    expect(nodemailer.default.createTransport).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledWith({
      from: process.env.SMTP_FROM,
      to: "test@example.com",
      subject: "Hello",
      text: "Test",
      html: "<p>Hello</p>",
    });
  });
});
