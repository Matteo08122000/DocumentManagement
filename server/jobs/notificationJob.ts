// server/jobs/notificationJob.ts
import cron from "node-cron";
import { sendExpiryNotification } from "../email";
import { db } from "../lib/db"; // Il tuo modulo di connessione al database
import { documentStatus, notifications, documentItems } from "@shared/schema";

// Funzione per recuperare i documenti in scadenza e inviare notifiche
const processNotifications = async () => {
  try {
    // Esegui una query per recuperare le notifiche attive
    const activeNotifications = await db.select().from(notifications).where({
      active: true,
    });

    for (const notification of activeNotifications) {
      // Recupera i document items relativi a questa notifica che sono in scadenza
      const expiringItems = await db
        .select()
        .from(documentItems)
        .where({
          notification_days: notification.notificationDays,
        })
        // Filtra per stato "expiring" (questo presuppone che lo stato sia già stato calcolato e salvato)
        .andWhere("status", "=", documentStatus.EXPIRING);

      if (expiringItems.length > 0) {
        // Invia la email aggregata con le informazioni sui documenti in scadenza
        await sendExpiryNotification(notification.email, expiringItems);
        console.log(
          `Email inviata a ${notification.email} per ${expiringItems.length} documenti in scadenza.`
        );
      }
    }
  } catch (error) {
    console.error("Errore nel processare le notifiche: ", error);
  }
};

// Pianifica il job: ad esempio, ogni ora
cron.schedule("0 * * * *", async () => {
  console.log("Esecuzione job notifiche: ", new Date().toLocaleString());
  await processNotifications();
});

console.log("Job scheduler per notifiche avviato.");
