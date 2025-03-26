import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

// Schema di validazione per la registrazione
const registerSchema = z.object({
  username: z.string().min(3, 'Lo username deve contenere almeno 3 caratteri'),
  password: z
    .string()
    .min(6, 'La password deve contenere almeno 6 caratteri')
    .max(100, 'La password non può superare i 100 caratteri'),
  email: z.string().email('Inserisci un indirizzo email valido'),
  notificationDays: z
    .number({ coerce: true })
    .min(1, 'Il numero di giorni deve essere almeno 1')
    .max(365, 'Il numero di giorni non può superare 365')
    .default(30),
});

// Tipo per i dati del form
type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Configurazione del form con react-hook-form
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      email: '',
      notificationDays: 30,
    },
  });

  // Mutation per l'invio dei dati di registrazione
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      return apiRequest('POST', '/api/auth/register', data);
    },
    onSuccess: () => {
      toast({
        title: 'Registrazione completata',
        description: 'Il tuo account è stato creato con successo! Ora puoi effettuare il login.',
      });
      
      // Redirect alla pagina di login
      setLocation('/login');
    },
    onError: (error) => {
      toast({
        title: 'Errore di registrazione',
        description: error instanceof Error ? error.message : 'Si è verificato un errore durante la registrazione',
        variant: 'destructive',
      });
    },
  });

  // Gestione del submit del form
  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Registrati</CardTitle>
          <CardDescription>
            Crea un nuovo account per accedere al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Scegli uno username" {...field} />
                    </FormControl>
                    <FormDescription>
                      Lo username verrà utilizzato per accedere al sistema
                    </FormDescription>
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
                      La tua email verrà utilizzata per le notifiche di documenti in scadenza
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Crea una password" {...field} />
                    </FormControl>
                    <FormDescription>
                      La password deve contenere almeno 6 caratteri
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notificationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giorni di notifica</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="30" 
                        min={1}
                        max={365}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Numero di giorni prima della scadenza in cui ricevere le notifiche
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Registrazione in corso...' : 'Registrati'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm">
            Hai già un account?{' '}
            <Link href="/login">
              <a className="font-medium text-blue-600 hover:text-blue-500">
                Accedi
              </a>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;