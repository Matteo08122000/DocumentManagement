import path from "path";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { parseDocumentNameSchema } from "@shared/schema";

export const parseDocumentName = (filename: string) => {
  try {
    // Remove file extension
    const nameWithoutExt = path.basename(filename, path.extname(filename));

    // Try to parse the filename based on our format: "4.2-Sicurezza Alimentare-Rev.1-20250325"
    const parts = nameWithoutExt.split("-");

    if (parts.length !== 4) {
      throw new Error(
        `Formato nome file non valido: ${filename}. Formato atteso: "4.2-Sicurezza Alimentare-Rev.1-20250325"`
      );
    }

    const [pointNumber, title, revision, dateStr] = parts;

    // Parse the date (format: YYYYMMDD or DDMMYYYY)
    let date: Date;
    if (dateStr.length === 8) {
      // Try YYYYMMDD
      if (/^\d{8}$/.test(dateStr)) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // Months are 0-based
        const day = parseInt(dateStr.substring(6, 8));
        date = new Date(year, month, day);

        // Check if date is valid
        if (isNaN(date.getTime())) {
          // Try DDMMYYYY format
          const day = parseInt(dateStr.substring(0, 2));
          const month = parseInt(dateStr.substring(2, 4)) - 1;
          const year = parseInt(dateStr.substring(4, 8));
          date = new Date(year, month, day);

          if (isNaN(date.getTime())) {
            throw new Error(`Data non valida nel nome del file: ${dateStr}`);
          }
        }
      } else {
        throw new Error(
          `Formato data non valido nel nome del file: ${dateStr}`
        );
      }
    } else {
      throw new Error(`Formato data non valido nel nome del file: ${dateStr}`);
    }

    // Validate with schema
    return parseDocumentNameSchema.parse({
      pointNumber: pointNumber.trim(),
      title: title.trim(),
      revision: revision.trim(),
      date: date.toISOString(),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(fromZodError(error).message);
    }
    throw error;
  }
};
