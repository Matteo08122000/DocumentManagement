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

export default function Home() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Fetch documents
  const { data: documents, isLoading, refetch } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  // Fetch document stats
  const { data: stats } = useQuery<{
    valid: number;
    expiring: number;
    expired: number;
    obsolete: number;
  }>({
    queryKey: ['/api/documents/stats'],
  });

  // Handle refresh index
  const handleRefreshIndex = async () => {
    try {
      await refetch();
      toast({
        title: "Indice aggiornato",
        description: "I documenti sono stati aggiornati con successo.",
      });
    } catch (error) {
      console.error("Error refreshing documents:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'indice dei documenti.",
        variant: "destructive",
      });
    }
  };

  // Filter documents based on search term
  const filteredDocuments = documents?.filter(doc => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      doc.pointNumber.toLowerCase().includes(searchLower) ||
      doc.title.toLowerCase().includes(searchLower) ||
      doc.revision.toLowerCase().includes(searchLower)
    );
  });

  // Handle document selection for revision update
  const handleDocumentUpdate = (document: Document) => {
    setSelectedDocument(document);
    setShowRevisionModal(true);
  };

  return (
    <MainLayout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestionale Documenti</h1>
        <p className="mt-1 text-sm text-gray-600">Gestisci e monitora i tuoi documenti di qualità e conformità</p>
      </div>

      {/* Document Upload Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Caricamento Documenti</h2>
            <p className="mt-1 text-sm text-gray-500">Carica una nuova cartella o aggiorna documenti esistenti</p>
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

        {/* Upload Area */}
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

      {/* Document Dashboard */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Cruscotto Documenti</h2>
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
          onViewDocument={(doc) => window.location.href = `/document/${doc.id}`}
          onUpdateDocument={handleDocumentUpdate}
        />
      </div>

      {/* Status Summary */}
      <StatusSummary stats={stats} />

      {/* Email Notification Modal */}
      {showEmailModal && (
        <EmailNotificationModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {/* Revision Upload Modal */}
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
              description: "La revisione del documento è stata aggiornata con successo.",
            });
          }}
        />
      )}
    </MainLayout>
  );
}
