import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

export const useDocumentUpload = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const refreshIndexMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/refresh-index', {});
    },
    onSuccess: () => {
      toast({
        title: 'Indice aggiornato',
        description: 'L\'indice dei documenti è stato aggiornato con successo',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/statistics'] });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: `Impossibile aggiornare l'indice: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
        variant: 'destructive'
      });
    }
  });
  
  const openUploadModal = () => setIsUploadModalOpen(true);
  const closeUploadModal = () => setIsUploadModalOpen(false);
  
  const refreshIndex = () => refreshIndexMutation.mutate();
  
  return {
    isUploadModalOpen,
    openUploadModal,
    closeUploadModal,
    refreshIndex,
    isRefreshing: refreshIndexMutation.isPending
  };
};
