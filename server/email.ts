// server/email.ts
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Configura il transporter con le variabili d'ambiente o i parametri del tuo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true per porti 465, false per altri
  auth: {
    user: process.env.SMTP_USER, // il tuo account SMTP
    pass: process.env.SMTP_PASS, // la tua password
  },
});

export const sendExpiryNotification = async (
  email: string,
  documentItems: { title: string; expirationDate: Date }[]
) => {
  const itemsList = documentItems
    .map(
      (item) =>
        `- ${item.title} scade il ${item.expirationDate.toLocaleDateString()}`
    )
    .join("\n");

  const mailOptions = {
    from: '"DocGenius" <docgenius8@gmail.com>',
    to: email,
    subject: "Notifica: Documenti in scadenza",
    text: `Ciao,\n\nI seguenti documenti stanno per scadere:\n\n${itemsList}\n\nSaluti,\nIl team di DocGenius`,
  };

  await transporter.sendMail(mailOptions);
};

export const sendSupportEmail = async (
  name: string,
  fromEmail: string,
  subject: string,
  message: string
) => {
  const mailOptions = {
    from: `"${name}" <${fromEmail}>`,
    to: "docgenius8@gmail.com",
    subject: `💬 Supporto cliente - ${subject}`,
    text: `Hai ricevuto una nuova richiesta di supporto:\n\nDa: ${name} <${fromEmail}>\nOggetto: ${subject}\n\nMessaggio:\n${message}`,
  };

  await transporter.sendMail(mailOptions);
};
