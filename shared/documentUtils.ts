import { documentStatus } from "@shared/schema";
import type { DocumentItem } from "@shared/schema";

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
