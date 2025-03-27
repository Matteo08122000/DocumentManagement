import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminSection, setShowAdminSection] = useState(false);

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

  // Query per ottenere le informazioni sugli utenti
  const { data: userReport, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/clean-users'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/clean-users');
      return await response.json();
    },
    enabled: false, // Non eseguire la query automaticamente
  });

  // Mutation per pulire gli utenti con password non hashate
  const cleanUsersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/clean-users');
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Operazione completata',
        description: `Eliminati ${data.deleted} utenti con password non hashate.`,
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante la pulizia degli utenti',
        variant: 'destructive',
      });
    },
  });

  // Verifica la password di amministrazione
  const handleAdminAccess = () => {
    if (adminPassword === 'admin123') { // Semplice password per scopi dimostrativi
      setShowAdminSection(true);
      refetch(); // Carica i dati degli utenti
    } else {
      toast({
        title: 'Accesso negato',
        description: 'Password non valida',
        variant: 'destructive',
      });
    }
  };

  // Mutation per l'invio del messaggio di supporto
  const supportMutation = useMutation({
    mutationFn: async (data: SupportFormData) => {
      const response = await apiRequest('POST', '/api/support', data);
      // Verifica che la risposta sia in formato JSON prima di restituirla
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json();
      } else {
        throw new Error("Errore del server: Risposta non valida");
      }
    },
    onSuccess: (data) => {
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
                <div className="flex items-center">
                  <span className="material-icons-round text-primary-600 mr-2 flex-shrink-0">email</span>
                  <span className="text-sm whitespace-nowrap">supporto@esempio.com</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons-round text-primary-600 mr-2 flex-shrink-0">phone</span>
                  <span className="text-sm whitespace-nowrap">+39 123 456 7890</span>
                </div>
                <div className="flex items-center">
                  <span className="material-icons-round text-primary-600 mr-2 flex-shrink-0">schedule</span>
                  <span className="text-sm whitespace-nowrap">Lun-Ven: 9:00-18:00</span>
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
            
            {/* Sezione Area Admin */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Area Amministratore</CardTitle>
                <CardDescription>Accesso riservato</CardDescription>
              </CardHeader>
              <CardContent>
                {!showAdminSection ? (
                  <div className="space-y-4">
                    <Input 
                      type="password" 
                      placeholder="Password admin"
                      value={adminPassword} 
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <Button 
                      onClick={handleAdminAccess} 
                      className="w-full"
                    >
                      Accedi
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm mb-2">Accesso amministratore abilitato</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAdminSection(false)} 
                      className="mb-4"
                      size="sm"
                    >
                      Esci
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            {!showAdminSection ? (
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
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Gestione Utenti</CardTitle>
                  <CardDescription>
                    Gestione degli utenti con password non hashate
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Utenti del sistema</h3>
                      <Button 
                        onClick={() => cleanUsersMutation.mutate()} 
                        variant="destructive"
                        disabled={cleanUsersMutation.isPending || isLoading}
                      >
                        {cleanUsersMutation.isPending 
                          ? 'Pulizia in corso...' 
                          : 'Elimina utenti non sicuri'}
                      </Button>
                    </div>
                    
                    {error && (
                      <Alert variant="destructive">
                        <AlertTitle>Errore</AlertTitle>
                        <AlertDescription>
                          {error instanceof Error ? error.message : 'Errore durante il recupero dei dati'}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <span className="material-icons-round animate-spin text-3xl">refresh</span>
                      </div>
                    ) : userReport ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <h4 className="text-lg font-medium">Totale utenti</h4>
                                <p className="text-3xl font-bold">{userReport.after}</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <h4 className="text-lg font-medium">Utenti eliminati</h4>
                                <p className="text-3xl font-bold">{userReport.deleted}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <Accordion type="single" collapsible>
                          <AccordionItem value="users">
                            <AccordionTrigger>Dettaglio utenti rimanenti</AccordionTrigger>
                            <AccordionContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Password hashata</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {userReport.remainingUsers?.map((user: any) => (
                                    <TableRow key={user.id}>
                                      <TableCell>{user.id}</TableCell>
                                      <TableCell>{user.username}</TableCell>
                                      <TableCell>{user.email}</TableCell>
                                      <TableCell>{user.isHashed ? '✅' : '❌'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </AccordionContent>
                          </AccordionItem>
                          
                          {userReport.deletedUsers && userReport.deletedUsers.length > 0 && (
                            <AccordionItem value="deleted">
                              <AccordionTrigger>Utenti eliminati</AccordionTrigger>
                              <AccordionContent>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>ID</TableHead>
                                      <TableHead>Username</TableHead>
                                      <TableHead>Email</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {userReport.deletedUsers?.map((user: any) => (
                                      <TableRow key={user.id}>
                                        <TableCell>{user.id}</TableCell>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p>Clicca sul pulsante "Elimina utenti non sicuri" per eseguire la pulizia</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;