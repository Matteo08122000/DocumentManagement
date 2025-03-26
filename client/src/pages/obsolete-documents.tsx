import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Document } from "@shared/schema";
import { Search, FileArchive, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateFromString } from "@/lib/document-parser";
import { getFileIcon } from "@/lib/file-utils";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function ObsoleteDocuments() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents/obsolete'],
  });

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

  const handleDownload = async (documentId: number) => {
    try {
      window.open(`/api/documents/${documentId}/download`, '_blank');
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Errore",
        description: "Impossibile scaricare il documento.",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Documenti Obsoleti</h1>
        <p className="mt-1 text-sm text-gray-600">Storico delle versioni precedenti dei documenti</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <FileArchive className="h-5 w-5 text-gray-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Archivio Revisioni</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Cerca documenti obsoleti..."
              className="pl-10 pr-3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Punto Norma
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Titolo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revisione
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Emissione
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments && filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{doc.pointNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{doc.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{doc.revision}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDateFromString(doc.issueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center text-sm">
                          {getFileIcon(doc.fileType)} {doc.fileType.charAt(0).toUpperCase() + doc.fileType.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/document/${doc.id}`}>
                          <Button variant="ghost" size="sm" className="mr-2">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDownload(doc.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nessun documento obsoleto trovato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
