// Percorso consigliato: server/jobs/checkExpiringDocumentsAndNotify.ts
// Assicurati che "jobs" sia una cartella dedicata ai task schedulati

import { pool } from "../storage";
import { sendExpiryNotification } from "server/email";
import { subDays, subMonths, isSameDay } from "date-fns";

interface RawDocumentItem {
  id: number;
  title: string;
  expiration_date: string | null;
  notification_value: number;
  notification_unit: "days" | "months";
  notification_email: string | null;
}

export async function checkExpiringDocumentsAndNotify() {
  const query = `
    SELECT id, title, expiration_date, notification_value, notification_unit, notification_email
    FROM document_items
    WHERE expiration_date IS NOT NULL AND notification_email IS NOT NULL
  `;

  const items: RawDocumentItem[] = await new Promise((resolve, reject) => {
    pool.query(query, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

  const today = new Date();

  for (const item of items) {
    const expiration = new Date(item.expiration_date!);
    let notifyDate = new Date(expiration);

    if (item.notification_unit === "days") {
      notifyDate = subDays(notifyDate, item.notification_value);
    } else {
      notifyDate = subMonths(notifyDate, item.notification_value);
    }

    console.log(
      `🔍 ${
        item.title
      }: notifica il ${notifyDate.toISOString()} (oggi: ${today.toISOString()})`
    );

    if (isSameDay(notifyDate, today)) {
      await sendExpiryNotification({
        to: item.notification_email!,
        subject: `Promemoria Scadenza: ${item.title}`,
        text: `Il documento "${
          item.title
        }" scadrà il ${expiration.toLocaleDateString()}`,
      });
      console.log(`📧 Email inviata a ${item.notification_email}`);
    }
  }
}
