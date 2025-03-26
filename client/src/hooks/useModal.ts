import { useState } from 'react';
import { Document } from '@shared/schema';

export const useModal = () => {
  const [isDocumentDetailModalOpen, setIsDocumentDetailModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  const openDocumentDetailModal = (document: Document) => {
    setSelectedDocument(document);
    setIsDocumentDetailModalOpen(true);
  };
  
  const closeDocumentDetailModal = () => {
    setIsDocumentDetailModalOpen(false);
    setSelectedDocument(null);
  };
  
  return {
    isDocumentDetailModalOpen,
    selectedDocument,
    openDocumentDetailModal,
    closeDocumentDetailModal
  };
};
