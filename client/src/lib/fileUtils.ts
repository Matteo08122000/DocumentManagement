/**
 * Extracts document information from filename
 * Expected format: "4.2-Sicurezza Alimentare-Rev.1-20250325"
 */
export const parseDocumentName = (filename: string) => {
  try {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    
    // Split by hyphens
    const parts = nameWithoutExt.split('-');
    if (parts.length !== 4) {
      throw new Error(`Nome file non valido: ${filename}. Formato atteso: "4.2-Sicurezza Alimentare-Rev.1-20250325"`);
    }
    
    const [pointNumber, title, revision, dateStr] = parts;
    
    // Parse the date (format: YYYYMMDD or DDMMYYYY)
    let date: Date;
    if (dateStr.length === 8) {
      // Try YYYYMMDD first
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // Months are 0-based
      const day = parseInt(dateStr.substring(6, 8));
      date = new Date(year, month, day);
      
      // If the date is not valid, try DDMMYYYY
      if (isNaN(date.getTime())) {
        const day = parseInt(dateStr.substring(0, 2));
        const month = parseInt(dateStr.substring(2, 4)) - 1;
        const year = parseInt(dateStr.substring(4, 8));
        date = new Date(year, month, day);
        
        if (isNaN(date.getTime())) {
          throw new Error(`Data non valida: ${dateStr}`);
        }
      }
    } else {
      throw new Error(`Formato data non valido: ${dateStr}`);
    }
    
    return {
      pointNumber: pointNumber.trim(),
      title: title.trim(),
      revision: revision.trim(),
      date
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Errore nel parsing del nome file: ${filename}`);
  }
};

/**
 * Returns file type based on file extension
 */
export const getFileTypeFromExt = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'xls':
    case 'xlsx':
    case 'csv':
      return 'excel';
    case 'doc':
    case 'docx':
    case 'rtf':
      return 'word';
    case 'pdf':
      return 'pdf';
    default:
      return 'unknown';
  }
};

/**
 * Convert file size to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
