import { documentStatus } from "@shared/schema";
import type { DocumentItem } from "@shared/schema";

export function calcolaStatus(
  expiration_date: string | Date,
  notification_value: number,
  notification_unit: "days" | "months"
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 🔒 Rende today a mezzanotte (evita problemi di orario)

  const scadenza = new Date(expiration_date);
  scadenza.setHours(0, 0, 0, 0); // 🔒 stessa cosa

  const preavvisoDate = new Date(scadenza);

  if (notification_unit === "days") {
    preavvisoDate.setDate(preavvisoDate.getDate() - notification_value);
  } else {
    preavvisoDate.setMonth(preavvisoDate.getMonth() - notification_value);
  }
  preavvisoDate.setHours(0, 0, 0, 0); // 🔒 anche qui

  if (today >= scadenza) return documentStatus.EXPIRED;
  if (today >= preavvisoDate) return documentStatus.EXPIRING;
  return documentStatus.VALID;
}
export const aggregateDocumentStatus = (items: DocumentItem[]): string => {
  let worst = documentStatus.VALID;
  for (const item of items) {
    // Se uno è scaduto, non serve andare avanti: lo stato peggiore è scaduto.
    if (item.status === documentStatus.EXPIRED) return documentStatus.EXPIRED;
    if (item.status === documentStatus.EXPIRING)
      worst = documentStatus.EXPIRING;
  }
  return worst;
};
