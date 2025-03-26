import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Upload, File, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseDocumentName } from '@/lib/document-parser';

interface DocumentUploadProps {
  onUploadComplete: () => void;
  onCancel: () => void;
  parentId?: number;
}

export default function DocumentUpload({ onUploadComplete, onCancel, parentId }: DocumentUploadProps) {
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter files to only accept those with valid naming pattern
    const validFiles: File[] = [];
    const invalidFiles: { file: File; reason: string }[] = [];

    for (const file of acceptedFiles) {
      const result = parseDocumentName(file.name);
      if (result.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, reason: result.error || 'Nome file non valido' });
      }
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "Alcuni file non sono validi",
        description: `${invalidFiles.length} file non seguono il formato richiesto: PointNumber-Title-Rev.Number-YYYYMMDD.extension`,
        variant: "destructive",
      });
    }

    setUploadingFiles(prev => [...prev, ...validFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/pdf': ['.pdf'],
    },
  });

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (uploadingFiles.length === 0) {
      toast({
        title: "Nessun file da caricare",
        description: "Seleziona almeno un file da caricare.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      for (const file of uploadingFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        if (parentId) {
          formData.append('parentId', parentId.toString());
        }

        await apiRequest('POST', '/api/documents/upload', formData);
      }

      // Invalidate queries to refresh document list
      await queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      
      toast({
        title: "Caricamento completato",
        description: `${uploadingFiles.length} documenti caricati con successo.`,
      });
      
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Errore di caricamento",
        description: "Si è verificato un errore durante il caricamento dei file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
      <div {...getRootProps()} className={`cursor-pointer text-center ${isDragActive ? 'bg-gray-50' : ''}`}>
        <input {...getInputProps()} />
        <div className="space-y-2">
          <Upload className="mx-auto h-10 w-10 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Trascina qui i tuoi documenti</h3>
          <p className="text-sm text-gray-500">oppure</p>
          <Button type="button" className="mx-auto">
            Seleziona File
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Supporta documenti Excel, Word e PDF nel formato: PointNumber-Title-Rev.Number-YYYYMMDD.extension
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">File selezionati:</h4>
          <ul className="divide-y divide-gray-200">
            {uploadingFiles.map((file, index) => (
              <li key={index} className="py-2 flex justify-between items-center">
                <div className="flex items-center">
                  <File className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={isUploading}
            >
              Annulla
            </Button>
            <Button 
              onClick={uploadFiles}
              disabled={isUploading}
            >
              {isUploading ? 'Caricamento in corso...' : 'Carica documenti'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
