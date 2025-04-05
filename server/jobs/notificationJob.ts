// server/jobs/notificationJob.ts
import cron from "node-cron";
import { sendExpiryNotification } from "../email";
import { db } from "../lib/db";
import { notifications, documentItems } from "@shared/schema";
import { calcolaStatus } from "@shared/documentUtils";

const processNotifications = async () => {
  try {
    const activeNotifications = await db
      .select()
      .from(notifications)
      .where({ active: true });

    for (const notification of activeNotifications) {
      const allItems = await db
        .select()
        .from(documentItems)
        .where({ notification_days: notification.notificationDays });

      const expiringItems = allItems.filter((item) => {
        const status = calcolaStatus(
          item.expirationDate,
          item.notification_days
        );
        return status === "expiring"; // oppure documentStatus.EXPIRING se hai importato l'enum
      });

      if (expiringItems.length > 0) {
        await sendExpiryNotification(notification.email, expiringItems);
        console.log(
          `📬 Email inviata a ${notification.email} per ${expiringItems.length} documenti in scadenza.`
        );
      }
    }
  } catch (error) {
    console.error("❌ Errore nel job notifiche: ", error);
  }
};

// Esegui ogni giorno alle 8:00 (modificabile)
cron.schedule("0 8 * * *", async () => {
  console.log("🔄 Esecuzione job notifiche: ", new Date().toLocaleString());
  await processNotifications();
});

console.log("✅ Scheduler notifiche attivo");
