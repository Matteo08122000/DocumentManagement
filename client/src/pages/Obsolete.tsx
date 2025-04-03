import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Document } from "@shared/schema";
import { formatDate } from "@/lib/dateUtils";
import FileIcon from "@/components/ui/FileIcon";
import StatusEmoji from "@/components/ui/StatusEmoji";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

const Obsolete: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Se l'utente non è autenticato, mostra un messaggio di accesso richiesto
  if (!isAuthenticated) {
    return (
      <div className="py-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Accesso richiesto
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Per visualizzare i documenti obsoleti è necessario effettuare
            l'accesso. Solo gli utenti autenticati possono accedere a questa
            sezione per motivi di sicurezza.
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
  const {
    data: documents,
    isLoading,
    error,
  } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents?includeObsolete=true");
      if (!res.ok)
        throw new Error("Errore nel caricamento dei documenti obsoleti");
      return res.json();
    },
  });

  const obsoleteDocuments = documents?.filter((doc) => doc.isObsolete) || [];

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Documenti Obsoleti
          </h2>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h2 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Documenti Obsoleti
          </h2>
          <div className="bg-red-50 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="material-icons-round text-red-400">error</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Errore nel caricamento dei documenti obsoleti
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error instanceof Error
                    ? error.message
                    : "Si è verificato un errore durante il caricamento."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            Documenti Obsoleti
          </h2>
          <div className="relative">
            <div className="flex items-center">
              <span className="material-icons-round text-blue-600 mr-2">
                history
              </span>
              <span className="text-sm text-gray-500">
                Totale: {obsoleteDocuments.length}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {obsoleteDocuments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <span className="material-icons-round text-gray-400 text-6xl mb-4">
                history
              </span>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessun documento obsoleto
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                I documenti diventano obsoleti quando vengono sostituiti da
                nuove revisioni.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Torna indietro
              </Button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {obsoleteDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.pointNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.revision}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.emissionDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileIcon fileType={doc.fileType} />
                          <span className="text-sm text-gray-900 ml-1">
                            {doc.fileType.charAt(0).toUpperCase() +
                              doc.fileType.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-primary-600 hover:text-primary-900 mr-3">
                          <span className="material-icons-round">download</span>
                        </button>
                        <button className="text-primary-600 hover:text-primary-900">
                          <span className="material-icons-round">
                            visibility
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Obsolete;
