import nodemailer from 'nodemailer';

/**
 * Configurazione del trasportatore Nodemailer.
 * Utilizza le variabili d'ambiente per impostare il server SMTP (host, porta, credenziali).
 * Questo oggetto gestisce l'effettivo invio delle email.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 465,
  secure: process.env.SMTP_SECURE === 'true', // true per 465, false per altre porte
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Invia un'email utilizzando il trasportatore configurato.
 *
 * @param options Oggetto contenente i dettagli dell'email:
 *  - to: Indirizzo email del destinatario.
 *  - subject: Oggetto dell'email.
 *  - text: Corpo dell'email in formato testo semplice.
 *  - html: (Opzionale) Corpo dell'email in formato HTML.
 */
export const sendEmail = async (options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
};
