import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

// Schema di validazione per il modulo di assistenza
const supportSchema = z.object({
  name: z.string().min(2, 'Il nome deve contenere almeno 2 caratteri'),
  email: z.string().email('Inserisci un indirizzo email valido'),
  subject: z.string().min(5, 'L\'oggetto deve contenere almeno 5 caratteri'),
  message: z.string().min(20, 'Il messaggio deve contenere almeno 20 caratteri'),
});

// Tipo per i dati del form
type SupportFormData = z.infer<typeof supportSchema>;

const Support: React.FC = () => {
  const { toast } = useToast();

  // Configurazione del form con react-hook-form
  const form = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  // Mutation per l'invio del messaggio di supporto
  const supportMutation = useMutation({
    mutationFn: async (data: SupportFormData) => {
      return apiRequest('POST', '/api/support', data);
    },
    onSuccess: () => {
      toast({
        title: 'Messaggio inviato',
        description: 'Il tuo messaggio è stato inviato con successo. Ti risponderemo al più presto.',
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Errore nell\'invio',
        description: error instanceof Error ? error.message : 'Errore durante l\'invio del messaggio',
        variant: 'destructive',
      });
    },
  });

  // Gestione del submit del form
  const onSubmit = (data: SupportFormData) => {
    supportMutation.mutate(data);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200 mb-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Assistenza</h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Contattaci</CardTitle>
                <CardDescription>Siamo qui per aiutarti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start">
                  <span className="material-icons-round text-primary-600 mr-2 flex-shrink-0">email</span>
                  <span className="text-sm break-all">supporto@esempio.com</span>
                </div>
                <div className="flex items-start">
                  <span className="material-icons-round text-primary-600 mr-2 flex-shrink-0">phone</span>
                  <span className="text-sm break-all">+39 123 456 7890</span>
                </div>
                <div className="flex items-start">
                  <span className="material-icons-round text-primary-600 mr-2 flex-shrink-0">schedule</span>
                  <span className="text-sm break-all">Lun-Ven: 9:00-18:00</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>FAQ</CardTitle>
                <CardDescription>Domande frequenti</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm">Come faccio a caricare un documento?</h4>
                  <p className="text-sm text-gray-600">Vai alla dashboard e clicca su "Carica Documenti".</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Come funzionano le notifiche?</h4>
                  <p className="text-sm text-gray-600">Le notifiche vengono inviate all'email registrata quando un documento è in scadenza.</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Posso modificare i miei dati?</h4>
                  <p className="text-sm text-gray-600">Sì, puoi aggiornare il tuo profilo dalle impostazioni del tuo account.</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Modulo di Assistenza</CardTitle>
                <CardDescription>
                  Compila il modulo sottostante per segnalare problemi o richiedere assistenza
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Il tuo nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="La tua email" {...field} />
                          </FormControl>
                          <FormDescription>
                            Ti risponderemo a questo indirizzo email
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Oggetto</FormLabel>
                          <FormControl>
                            <Input placeholder="Oggetto della richiesta" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Messaggio</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descrivi il problema o la richiesta di assistenza in dettaglio" 
                              className="min-h-[150px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={supportMutation.isPending}
                    >
                      {supportMutation.isPending ? 'Invio in corso...' : 'Invia Messaggio'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;