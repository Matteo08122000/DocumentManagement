import React, { useState } from "react";
import DocumentStatusSummary from "@/components/dashboard/DocumentStatusSummary";
import DocumentTable from "@/components/dashboard/DocumentTable";
import DocumentDetailModal from "@/components/modals/DocumentDetailModal";
import UploadModal from "@/components/modals/UploadModal";
import { Document } from "@shared/schema";
import { useDocuments } from "@/hooks/useDocuments";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { useModal } from "@/hooks/useModal";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const Dashboard: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { refreshDocuments, isUpdating } = useDocuments();
  const {
    isUploadModalOpen,
    openUploadModal,
    closeUploadModal,
    refreshIndex,
    isRefreshing,
  } = useDocumentUpload();

  const {
    isDocumentDetailModalOpen,
    selectedDocument,
    openDocumentDetailModal,
    closeDocumentDetailModal,
  } = useModal();

  const handleViewDocument = (document: Document) => {
    openDocumentDetailModal(document);
  };

  const handleEditDocument = (document: Document) => {
    openDocumentDetailModal(document);
  };

  // Se l'utente non è autenticato, mostra un messaggio
  if (!isAuthenticated) {
    return (
      <div className="py-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Accesso richiesto
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Per caricare e gestire i documenti è necessario effettuare
            l'accesso. Solo gli utenti autenticati possono accedere all'archivio
            documenti.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login">
              <Button className="w-full sm:w-auto">Accedi</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full sm:w-auto">
                Registrati
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            Cruscotto Documenti
          </h2>
          <div className="mt-3 sm:mt-0 sm:ml-4 flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
            <Button
              onClick={openUploadModal}
              className="inline-flex items-center"
            >
              <span className="material-icons-round mr-2 text-sm">
                upload_file
              </span>
              Carica Documenti
            </Button>
            <Button
              variant="outline"
              onClick={refreshIndex}
              disabled={isRefreshing}
            >
              <span className="material-icons-round mr-2 text-sm">refresh</span>
              Aggiorna Indice
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <DocumentStatusSummary />

          <div className="mt-8">
            <DocumentTable
              onViewDocument={handleViewDocument}
              onEditDocument={handleEditDocument}
            />
          </div>
        </div>
      </div>

      <DocumentDetailModal
        document={selectedDocument}
        isOpen={isDocumentDetailModalOpen}
        onClose={closeDocumentDetailModal}
      />

      <UploadModal isOpen={isUploadModalOpen} onClose={closeUploadModal} />
    </div>
  );
};

export default Dashboard;
