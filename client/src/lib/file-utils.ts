import { FileText, FileWord, FilePdf } from "lucide-react";
import React from "react";

/**
 * Get appropriate icon for a file type
 */
export function getFileIcon(fileType: string): React.ReactNode {
  switch (fileType.toLowerCase()) {
    case 'excel':
      return <FileText className="text-green-500 mr-1 h-4 w-4" />;
    case 'word':
      return <FileWord className="text-blue-500 mr-1 h-4 w-4" />;
    case 'pdf':
      return <FilePdf className="text-red-500 mr-1 h-4 w-4" />;
    default:
      return <FileText className="text-gray-500 mr-1 h-4 w-4" />;
  }
}

/**
 * Check if a file is about to expire based on warning days
 */
export function isExpiring(expirationDate: string, warningDays: number): boolean {
  if (!expirationDate || expirationDate.length !== 8) {
    return false;
  }
  
  try {
    const year = parseInt(expirationDate.substring(0, 4));
    const month = parseInt(expirationDate.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(expirationDate.substring(6, 8));
    
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

/**
 * Check if a file has expired
 */
export function isExpired(expirationDate: string): boolean {
  if (!expirationDate || expirationDate.length !== 8) {
    return false;
  }
  
  try {
    const year = parseInt(expirationDate.substring(0, 4));
    const month = parseInt(expirationDate.substring(4, 6)) - 1; // JS months are 0-indexed
    const day = parseInt(expirationDate.substring(6, 8));
    
    const expDate = new Date(year, month, day);
    const today = new Date();
    
    return expDate < today;
  } catch (error) {
    return false;
  }
}
