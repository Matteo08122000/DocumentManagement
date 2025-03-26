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

// Schema di validazione per il login
const loginSchema = z.object({
  username: z.string().min(3, 'Lo username deve contenere almeno 3 caratteri'),
  password: z.string().min(6, 'La password deve contenere almeno 6 caratteri'),
});

// Tipo per i dati del form
type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Configurazione del form con react-hook-form
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Mutation per l'invio dei dati di login
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return apiRequest('POST', '/api/auth/login', data);
    },
    onSuccess: () => {
      toast({
        title: 'Login effettuato',
        description: 'Sei stato autenticato con successo!',
      });
      
      // Redirect alla dashboard
      setLocation('/');
    },
    onError: (error) => {
      toast({
        title: 'Errore di autenticazione',
        description: error instanceof Error ? error.message : 'Username o password non validi',
        variant: 'destructive',
      });
    },
  });

  // Gestione del submit del form
  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Accedi</CardTitle>
          <CardDescription>
            Inserisci le tue credenziali per accedere al sistema
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
                      <Input placeholder="Il tuo username" {...field} />
                    </FormControl>
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
                      <Input type="password" placeholder="La tua password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Autenticazione in corso...' : 'Accedi'}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm">
            Non hai un account?{' '}
            <Link href="/register">
              <a className="font-medium text-blue-600 hover:text-blue-500">
                Registrati ora
              </a>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;