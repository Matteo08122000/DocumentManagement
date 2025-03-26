export interface DocumentInfo {
  isValid: boolean;
  pointNumber?: string;
  title?: string;
  revision?: string;
  issueDate?: string;
  error?: string;
}

/**
 * Parse document name following the format: 4.2-Sicurezza Alimentare-Rev.1-20250325.ext
 */
export function parseDocumentName(fileName: string): DocumentInfo {
  const nameRegex = /^([\d\.]+)-([^-]+)-Rev\.(\d+)-(\d{8})\.(.+)$/;
  const match = fileName.match(nameRegex);
  
  if (!match) {
    return {
      isValid: false,
      error: 'Il nome del file deve seguire il formato: PointNumber-Title-Rev.Number-YYYYMMDD.extension'
    };
  }
  
  const [_, pointNumber, title, revisionNumber, issueDate, _extension] = match;
  
  // Validate date format (YYYYMMDD)
  if (!/^\d{8}$/.test(issueDate)) {
    return {
      isValid: false,
      error: 'La data di emissione deve essere nel formato YYYYMMDD (es. 20250325)'
    };
  }
  
  return {
    isValid: true,
    pointNumber,
    title,
    revision: `Rev.${revisionNumber}`,
    issueDate
  };
}

/**
 * Convert date string from YYYYMMDD format to localized format (DD/MM/YYYY)
 */
export function formatDateFromString(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) {
    return dateStr; // Return as is if not in expected format
  }
  
  try {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    
    // Check if valid date
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    
    // Format as DD/MM/YYYY
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateStr;
  }
}
