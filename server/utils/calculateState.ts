import { documentStatus } from "@shared/schema";

export const calculateStatus = (
  expirationDate: Date | null,
  notificationDays: number = 30
): string => {
  if (!expirationDate) return documentStatus.VALID;

  const today = new Date();
  if (expirationDate < today) return documentStatus.EXPIRED;

  const diff = expirationDate.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= notificationDays) return documentStatus.EXPIRING;

  return documentStatus.VALID;
};
