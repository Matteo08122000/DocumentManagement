import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Document } from "../../../shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";
import { invalidateDocumentsCache } from "../lib/queryClient";

export const useDocuments = (includeObsolete = false) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ["/api/documents", includeObsolete],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/documents?includeObsolete=${includeObsolete}`
      );
      return res;
    },
    refetchOnMount: "always",
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : "Errore imprevisto nel recupero dei documenti";

      toast({
        title: "Errore",
        description: message,
        variant: "destructive",
      });
    },
  });

  // === Singolo documento ===
  const getDocumentById = (id: number) => {
    return useQuery<Document>({
      queryKey: ["/api/documents", id],
      queryFn: () => apiRequest("GET", `/api/documents/${id}`),
    });
  };

  // === Figli del documento ===
  const getChildDocuments = (parentId: number) => {
    return useQuery<Document[]>({
      queryKey: ["/api/documents", parentId, "children"],
      queryFn: () => apiRequest("GET", `/api/documents/${parentId}/children`),
    });
  };

  // === Marca documento come obsoleto ===
  const markObsoleteMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("PUT", `/api/documents/${id}/obsolete`, {}),
    onSuccess: () => {
      toast({
        title: "Documento obsoleto",
        description: "Il documento è stato spostato nella cartella obsoleti",
      });
      invalidateDocumentsCache(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile rendere obsoleto il documento: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    },
  });

  // === Aggiorna documento ===
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Document> }) =>
      apiRequest("PUT", `/api/documents/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Documento aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
      invalidateDocumentsCache(queryClient);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile aggiornare il documento: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    },
  });

  // === Refresh manuale ===
  const refreshDocuments = () => {
    invalidateDocumentsCache(queryClient);
    return refetch();
  };

  return {
    documents,
    isLoading,
    error,
    refetch,
    getDocumentById,
    getChildDocuments,
    markObsolete: markObsoleteMutation.mutate,
    updateDocument: updateDocumentMutation.mutate,
    refreshDocuments,
    isMarkingObsolete: markObsoleteMutation.isPending,
    isUpdating: updateDocumentMutation.isPending,
  };
};
