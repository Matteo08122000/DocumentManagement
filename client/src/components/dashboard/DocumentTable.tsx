import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/dateUtils";
import FileIcon from "@/components/ui/FileIcon";
import StatusEmoji from "@/components/ui/StatusEmoji";
import path from "path-browserify";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@shared/schema";
import { useDocuments } from "@/hooks/useDocuments";
import DocumentEditModal from "../DocumentEditModal";
import { useAuth } from "@/hooks/use-auth";

interface DocumentTableProps {
  onViewDocument: (document: Document) => void;
  onEditDocument: (document: Document) => void;
}

const DocumentTable: React.FC<DocumentTableProps> = ({
  onViewDocument,
  onEditDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { documents, isLoading, error } = useDocuments(false);
  const itemsPerPage = 10;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const { csrfToken } = useAuth();

  const handleEdit = (doc: Document) => {
    setSelectedDoc(doc);
    setEditModalOpen(true);
  };

  const inferLabelFromMime = (mime: string) => {
    const lower = mime.toLowerCase();

    if (lower.includes("sheet") || lower.includes("excel")) return "Excel";
    if (lower.includes("word")) return "Word";
    if (lower.includes("pdf")) return "PDF";

    return "Documento";
  };

  const onDeleteDocument = async (document: Document) => {
    const confirmed = window.confirm(
      `Sei sicuro di voler eliminare il documento "${document.title}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Errore durante l'eliminazione del documento");
      }

      toast({
        title: "Documento eliminato",
        description: "Il documento è stato rimosso correttamente",
      });

      // Aggiorna la lista
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    } catch (error) {
      toast({
        title: "Errore",
        description:
          error instanceof Error
            ? error.message
            : "Errore durante l'eliminazione",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Elenco Documenti
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Caricamento in corso...
            </p>
          </div>
        </div>
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !documents) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="material-icons-round text-red-400">error</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Errore nel caricamento dei documenti
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error instanceof Error
                ? error.message
                : "Si è verificato un errore durante il caricamento dei documenti."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter documents based on search query
  const filteredDocuments = documents.filter(
    (doc) =>
      doc.pointNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.revision.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate documents
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Elenco Documenti
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Documenti ordinati per punto norma
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Cerca documento..."
            className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="material-icons-round text-gray-400">search</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Punto Norma
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Titolo
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Revisione
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Data Emissione
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Tipo
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Stato
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Azioni
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedDocuments.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  Nessun documento trovato
                </td>
              </tr>
            ) : (
              paginatedDocuments.map((document) => (
                <tr
                  key={document.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    document.status === "expired" ? "bg-red-50" : ""
                  }`}
                  onClick={() => onViewDocument(document)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {document.pointNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {document.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {document.revision}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(document.emissionDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {document.filePath ? (
                      <a
                        href={`${
                          import.meta.env.VITE_API_URL
                        }${document.filePath.replace(/.*uploads/, "/uploads")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileIcon fileType={document.fileType} />
                        <span className="text-sm text-gray-900 ml-1">
                          {inferLabelFromMime(document.fileType)}
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-center text-gray-400">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusEmoji status={document.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* Bottone modifica */}
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(document); // usa lo state interno
                        }}
                      >
                        <span className="material-icons-round">edit</span>
                      </button>

                      {/* Bottone elimina */}
                      <button
                        className="text-red-600 hover:text-red-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDocument(document);
                        }}
                      >
                        <span className="material-icons-round">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DocumentEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        document={selectedDoc}
      />

      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Precedente
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Successivo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Visualizzando{" "}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                a{" "}
                <span className="font-medium">
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredDocuments.length
                  )}
                </span>{" "}
                di{" "}
                <span className="font-medium">{filteredDocuments.length}</span>{" "}
                documenti
              </p>
            </div>
            <div>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Precedente</span>
                  <span className="material-icons-round text-sm">
                    chevron_left
                  </span>
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`
                      relative inline-flex items-center px-4 py-2 border text-sm font-medium
                      ${
                        currentPage === i + 1
                          ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }
                    `}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Successivo</span>
                  <span className="material-icons-round text-sm">
                    chevron_right
                  </span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTable;
