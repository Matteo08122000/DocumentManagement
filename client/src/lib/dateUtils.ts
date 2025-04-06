import { format, isValid, parseISO } from "date-fns";
import { it } from "date-fns/locale";

/**
 * Format a date string to DD/MM/YYYY
 */
export const formatDate = (dateString: string | Date): string => {
  try {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;

    if (!isValid(date)) {
      return "Data non valida";
    }

    return format(date, "dd/MM/yyyy", { locale: it });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Data non valida";
  }
};

/**
 * Parse a date string from Italian format (DD/MM/YYYY)
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    const parts = dateString.split("/");
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    return isValid(date) ? date : null;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
};

/**
 * Check if a date is expired
 */
export const isExpired = (dateString: string | Date): boolean => {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  if (!isValid(date)) {
    return false;
  }

  const today = new Date();
  return date < today;
};

/**
 * Check if a date is expiring (within the notification days)
 */
export const isExpiring = (
  dateString: string | Date,
  notification_value: number = 30
): boolean => {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;

  if (!isValid(date)) {
    return false;
  }

  const today = new Date();

  if (date < today) {
    return false; // Already expired
  }

  const differenceInTime = date.getTime() - today.getTime();
  const differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));

  return differenceInDays <= notification_value;
};

/**
 * Get document status based on expiration date
 */
export const getDocumentStatus = (
  expiration_date: string | Date | null,
  notification_value: number = 30
): string => {
  if (!expiration_date) return "valid";

  const date =
    typeof expiration_date === "string"
      ? new Date(expiration_date)
      : expiration_date;

  if (!isValid(date)) {
    return "valid";
  }

  if (isExpired(date)) {
    return "expired";
  }

  if (isExpiring(date, notification_value)) {
    return "expiring";
  }

  return "valid";
};
