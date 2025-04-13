import { FileText, FileSpreadsheet, FileType2 } from "lucide-react";

export function getFileIcon(fileType: string): React.ReactNode {
  switch (fileType.toLowerCase()) {
    case "excel":
      return <FileSpreadsheet className="text-green-500 mr-1 h-4 w-4" />;
    case "word":
      return <FileText className="text-blue-500 mr-1 h-4 w-4" />;
    case "pdf":
      return <FileText className="text-red-500 mr-1 h-4 w-4" />;
    default:
      return <FileType2 className="text-gray-500 mr-1 h-4 w-4" />;
  }
}

export function inferFileType(file_url?: string | null): string {
  if (!file_url) return "";
  const ext = file_url.split(".").pop()?.toLowerCase() || "";
  if (ext.includes("xls")) return "excel";
  if (ext.includes("doc")) return "word";
  if (ext.includes("pdf")) return "pdf";
  return "unknown";
}

/**
 * Check if a file is about to expire based on warning days
 */
export function isExpiring(
  expiration_date: string,
  warningDays: number
): boolean {
  if (!expiration_date || expiration_date.length !== 8) {
    return false;
  }

  try {
    const year = parseInt(expiration_date.substring(0, 4));
    const month = parseInt(expiration_date.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(expiration_date.substring(6, 8));

    const expDate = new Date(year, month, day);
    const today = new Date();

    // Add warning days to today to get the warning threshold
    const warningThreshold = new Date();
    warningThreshold.setDate(today.getDate() + warningDays);

    // If expiration date is before warning threshold but after today, it's expiring
    return expDate <= warningThreshold && expDate > today;
  } catch (error) {
    return false;
  }
}

export const inferLabelFromMime = (filename: string) => {
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (!ext) return "Documento";

  if (["xls", "xlsx"].includes(ext)) return "Excel";
  if (["doc", "docx"].includes(ext)) return "Word";
  if (ext === "pdf") return "PDF";

  return "Documento";
};


/**
 * Check if a file has expired
 */
export function isExpired(expiration_date: string): boolean {
  if (!expiration_date || expiration_date.length !== 8) {
    return false;
  }

  try {
    const year = parseInt(expiration_date.substring(0, 4));
    const month = parseInt(expiration_date.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(expiration_date.substring(6, 8));

    const expDate = new Date(year, month, day);
    const today = new Date();

    return expDate < today;
  } catch (error) {
    return false;
  }
}
