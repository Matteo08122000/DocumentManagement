import { documentStatus } from "@shared/schema";
import type { DocumentItem } from "@shared/schema";

export function calcolaStatus(
  data_scadenza: string,
  preavviso: number
): string {
  const today = new Date();
  const scadenza = new Date(data_scadenza);
  const preavvisoDate = new Date(scadenza);
  preavvisoDate.setDate(scadenza.getDate() - preavviso);

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
