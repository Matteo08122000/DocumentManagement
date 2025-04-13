import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentWithExpirations, Document, Expiration } from "@shared/schema";
import { getFileIcon, inferFileType } from "@/lib/file-utils";
import {
  ArrowLeft,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateFromString } from "@/lib/document-parser";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const documentId = parseInt(id);

  const {
    data: document,
    isLoading,
    error,
  } = useQuery<DocumentWithExpirations>({
    queryKey: [`/api/documents/${documentId}`],
    queryFn: () =>
      apiRequest<DocumentWithExpirations>(`/api/documents/${documentId}`),
    enabled: !isNaN(documentId),
  });

  const handleDownload = async () => {
    try {
      window.open(`/api/documents/${documentId}/download`, "_blank");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Errore",
        description: "Impossibile scaricare il documento.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="text-green-500 h-5 w-5" />;
      case "expiring":
        return <AlertTriangle className="text-yellow-500 h-5 w-5" />;
      case "expired":
        return <XCircle className="text-red-500 h-5 w-5" />;
      default:
        return <Clock className="text-gray-500 h-5 w-5" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "valid":
        return "✅ Valido";
      case "expiring":
        return "⚠️ In Scadenza";
      case "expired":
        return "❌ Scaduto";
      default:
        return "ℹ️ N/A";
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800";
      case "expiring":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
            </Button>
          </Link>
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-32 w-full mb-6" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  if (error || !document) {
    return (
      <MainLayout>
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Documento non trovato
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">
              Si è verificato un errore nel caricamento del documento.
              Assicurati che l'ID sia corretto.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Link href="/">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Indietro
            </Button>
          </Link>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">
            {document.title} - Dettaglio Documento
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(
              document.worstStatus || "valid"
            )}`}
          >
            {getStatusText(document.worstStatus || "valid")}
          </span>
          <span className="inline-flex items-center text-sm text-gray-500">
            {getFileIcon(document.fileType)}{" "}
            {document.fileType.charAt(0).toUpperCase() +
              document.fileType.slice(1)}
          </span>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Punto Norma</div>
            <div className="font-medium">{document.pointNumber}</div>
          </div>
          <div>
            <div className="text-gray-500">Revisione</div>
            <div className="font-medium">{document.revision}</div>
          </div>
          <div>
            <div className="text-gray-500">Data Emissione</div>
            <div className="font-medium">
              {formatDateFromString(document.issueDate)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Percorso File</div>
            <div className="font-medium truncate">{document.filePath}</div>
          </div>
        </div>
      </div>

      {document.fileType === "excel" &&
        document.expirations &&
        document.expirations.length > 0 && (
          <div className="mb-6">
            <h4 className="text-base font-medium text-gray-900 mb-3">
              Dettagli Documento
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Descrizione
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Scadenza
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
                      Preavviso
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {document.expirations.map((exp) => (
                    <tr key={exp.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {exp.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDateFromString(exp.expiration_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(
                            exp.status
                          )}`}
                        >
                          {getStatusText(exp.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {exp.warningDays} giorni
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {document.children && document.children.length > 0 && (
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-3">
            Documenti Collegati
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <ul className="divide-y divide-gray-200">
              {document.children.map((childDoc) => (
                <li
                  key={childDoc.id}
                  className="py-3 flex justify-between items-center"
                >
                  <div className="flex items-center">
                    {getFileIcon(childDoc.fileType)}
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {childDoc.title}
                    </span>
                  </div>
                  <Link href={`/document/${childDoc.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleDownload} className="inline-flex items-center">
          <Download className="mr-2 h-4 w-4" /> Scarica
        </Button>
      </div>
    </MainLayout>
  );
}
