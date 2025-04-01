import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: number;
  documentItemId?: number;
}

const formSchema = z.object({
  email: z.string().email({ message: "Email non valida" }),
  notificationDays: z.string().transform((val) => parseInt(val, 10)),
});

type FormData = z.infer<typeof formSchema>;

const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentItemId,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      notificationDays: "30",
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("POST", "/api/notifications", {
        email: data.email,
        documentId,
        documentItemId,
        notificationDays: data.notificationDays,
        active: true,
      });
    },
    onSuccess: () => {
      toast({
        title: "Notifica configurata",
        description: "Riceverai una notifica email prima della scadenza",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Impossibile configurare la notifica: ${
          error instanceof Error ? error.message : "Errore sconosciuto"
        }`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    createNotificationMutation.mutate(data);
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-icons-round text-yellow-600">
              notifications_active
            </span>
            Configura Notifiche Email
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Riceverai una notifica email prima della scadenza dei documenti.
            Inserisci l'indirizzo email e seleziona i giorni di preavviso
            desiderati.
          </p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Indirizzo Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="esempio@azienda.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createNotificationMutation.isPending}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={createNotificationMutation.isPending}
            >
              {createNotificationMutation.isPending
                ? "Salvataggio..."
                : "Salva Preferenze"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailNotificationModal;
