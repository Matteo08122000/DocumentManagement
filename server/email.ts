// server/email.ts
import nodemailer from "nodemailer";


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
  documentItems: { title: string; expiration_date: Date }[]
) => {
  const itemsList = documentItems
    .map(
      (item) =>
        `<li><strong>${
          item.title
        }</strong> – scadenza: ${item.expiration_date.toLocaleDateString()}</li>`
    )
    .join("");

  const mailOptions = {
    from: '"DocGenius" <docgenius8@gmail.com>',
    to: email,
    subject: "Notifica: Documenti in scadenza",
    html: `
    <p>Ciao,</p>
    <p>I seguenti documenti stanno per scadere:</p>
    <ul>${itemsList}</ul>
    <p>Saluti,<br/>Il team di DocGenius</p>
  `,
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
