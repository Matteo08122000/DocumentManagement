import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Document } from "../../../shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";

export const useDocuments = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all documents
  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Get document by ID
  const getDocumentById = (id: number) => {
    return useQuery<Document>({
      queryKey: ["/api/documents", id],
    });
  };

  // Get child documents
  const getChildDocuments = (parentId: number) => {
    return useQuery<Document[]>({
      queryKey: ["/api/documents", parentId, "children"],
    });
  };

  // Mark document as obsolete
  const markObsoleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PUT", `/api/documents/${id}/obsolete`, {});
    },
    onSuccess: () => {
      toast({
        title: "Documento obsoleto",
        description: "Il documento è stato spostato nella cartella obsoleti",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
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

  // Update document
  const updateDocumentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Document>;
    }) => {
      return apiRequest("PUT", `/api/documents/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Documento aggiornato",
        description: "Le modifiche sono state salvate con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
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

  // Refresh documents (used after upload)
  const refreshDocuments = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    queryClient.invalidateQueries({ queryKey: ["/api/statistics"] });
    return refetch();
  };

  return {
    documents,
    isLoading,
    error,
    getDocumentById,
    getChildDocuments,
    markObsolete: markObsoleteMutation.mutate,
    updateDocument: updateDocumentMutation.mutate,
    refreshDocuments,
    isMarkingObsolete: markObsoleteMutation.isPending,
    isUpdating: updateDocumentMutation.isPending,
  };
};
