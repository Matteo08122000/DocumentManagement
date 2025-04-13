import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import DocumentUpload from "@/components/document-upload";
import DocumentTable from "@/components/document-table";
import StatusSummary from "@/components/status-summary";
import EmailNotificationModal from "@/components/email-notification-modal";
import RevisionUploadModal from "@/components/revision-upload-modal";
import { Document } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, FolderUp, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { toast } = useToast();
  const { csrfToken } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );

  const {
    data: documents,
    isLoading,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    queryFn: () => apiRequest<Document[]>("GET", "/api/documents"),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/documents/stats"],
    queryFn: () => apiRequest("GET", "/api/documents/stats"),
  });

  const handleRefreshIndex = async () => {
    try {
      await apiRequest("POST", "/api/refresh-index", undefined, csrfToken);
      await refetch();
      toast({
        title: "Indice aggiornato",
        description: "I documenti sono stati aggiornati con successo.",
      });
    } catch (error) {
      console.error("Errore nel refresh index:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'indice dei documenti.",
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents?.filter((doc) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.pointNumber.toLowerCase().includes(searchLower) ||
      doc.title.toLowerCase().includes(searchLower) ||
      doc.revision.toLowerCase().includes(searchLower)
    );
  });

  const handleDocumentUpdate = (document: Document) => {
    setSelectedDocument(document);
    setShowRevisionModal(true);
  };

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestionale Documenti
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Gestisci e monitora i tuoi documenti di qualità e conformità
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">
              Caricamento Documenti
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Carica una nuova cartella o aggiorna documenti esistenti
            </p>
          </div>
          <div className="mt-4 md:mt-0 space-y-2 md:space-y-0 md:space-x-2 flex flex-col md:flex-row">
            <Button
              onClick={handleRefreshIndex}
              className="inline-flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Aggiorna Indice
            </Button>
            <Button
              onClick={() => setShowUploadArea(true)}
              variant="secondary"
              className="inline-flex items-center"
            >
              <FolderUp className="mr-2 h-4 w-4" /> Carica Cartella
            </Button>
          </div>
        </div>

        {showUploadArea && (
          <DocumentUpload
            onUploadComplete={() => {
              setShowUploadArea(false);
              refetch();
            }}
            onCancel={() => setShowUploadArea(false)}
          />
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Cruscotto Documenti
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Cerca documenti..."
                className="pl-10 pr-3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DocumentTable
          documents={filteredDocuments || []}
          isLoading={isLoading}
          onViewDocument={(doc) =>
            (window.location.href = `/document/${doc.id}`)
          }
          onUpdateDocument={handleDocumentUpdate}
        />
      </div>

      <StatusSummary stats={stats} />

      {showEmailModal && (
        <EmailNotificationModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showRevisionModal && selectedDocument && (
        <RevisionUploadModal
          isOpen={showRevisionModal}
          document={selectedDocument}
          onClose={() => {
            setShowRevisionModal(false);
            setSelectedDocument(null);
          }}
          onUploadComplete={() => {
            setShowRevisionModal(false);
            setSelectedDocument(null);
            refetch();
            toast({
              title: "Revisione aggiornata",
              description:
                "La revisione del documento è stata aggiornata con successo.",
            });
          }}
        />
      )}
    </MainLayout>
  );
}
