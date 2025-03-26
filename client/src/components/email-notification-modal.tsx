import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Inserisci un indirizzo email valido" }),
  notificationType: z.enum(["all", "critical"]),
});

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailNotificationModal({ isOpen, onClose }: EmailNotificationModalProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      notificationType: "all",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    
    try {
      const data = {
        email: values.email,
        notifications: true,
        onlyCritical: values.notificationType === "critical",
      };
      
      await apiRequest("POST", "/api/notifications/settings", data);
      
      toast({
        title: "Preferenze salvate",
        description: "Le tue preferenze di notifica sono state salvate con successo.",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving notification settings:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio delle preferenze.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-full">
              <Bell className="h-5 w-5 text-yellow-600" />
            </div>
            <DialogTitle>Configura Notifiche</DialogTitle>
          </div>
          <DialogDescription>
            Imposta la tua email per ricevere notifiche prima della scadenza dei documenti. Riceverai un avviso in base ai giorni di preavviso configurati.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="esempio@azienda.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notificationType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Preferenze di notifica</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="all" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Tutti i documenti in scadenza
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="critical" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Solo documenti critici
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvataggio..." : "Salva preferenze"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
