import cron from "node-cron";
import { storage } from "../storage";
import { sendExpiryNotification } from "../email";
import { differenceInCalendarDays, subMonths, subDays } from "date-fns";

const processNotifications = async () => {
  try {
    const allItems = await storage.getDocumentsWithNotificationEmail();
    console.log(allItems);
    const today = new Date();

    const groupedByEmail: Record<
      string,
      { title: string; expiration_date: Date }[]
    > = {};

    for (const item of allItems) {
      if (
        !item.expiration_date ||
        !item.notification_value ||
        !item.notification_unit ||
        !item.notification_email
      )
        continue;

      let notifyDate: Date;
      const expiration_date = new Date(item.expiration_date);

      if (item.notification_unit === "days") {
        notifyDate = subDays(expiration_date, item.notification_value);
      } else {
        notifyDate = subMonths(expiration_date, item.notification_value);
      }

      const diff = differenceInCalendarDays(today, notifyDate);
      if (diff === 0) {
        console.log(
          `📌 Documento in scadenza oggi: ${item.title}, ${item.expiration_date}`
        );
        if (!groupedByEmail[item.notification_email]) {
          groupedByEmail[item.notification_email] = [];
        }

        groupedByEmail[item.notification_email].push({
          title: item.title,
          expiration_date,
        });
      }
    }

    for (const [email, documentItems] of Object.entries(groupedByEmail)) {
      console.log("✔️ Inviare mail a:", email);
      await sendExpiryNotification(email, documentItems);
      console.log(
        `📬 Email inviata a ${email} per ${documentItems.length} documenti in scadenza.`
      );
    }
  } catch (error) {
    console.error("❌ Errore nel job notifiche: ", error);
  }
};

// Ogni giorno alle 8:00
cron.schedule("0 8 * * *", async () => {
  console.log("🔄 Esecuzione job notifiche: ", new Date().toLocaleString());
  await processNotifications();
});

console.log("✅ Scheduler notifiche attivo");
