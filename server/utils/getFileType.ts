import { documentTypes } from "@shared/schema";

export const getFileType = (mimetype: string): string => {
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) {
    return documentTypes.EXCEL;
  } else if (mimetype.includes("word")) {
    return documentTypes.WORD;
  } else if (mimetype.includes("pdf")) {
    return documentTypes.PDF;
  }
  return "unknown";
};
