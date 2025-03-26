import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  FileArchive, 
  Bell, 
  User,
  LogOut,
  LogIn,
  UserPlus,
  Info,
  HelpCircle,
  X
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

export default function Sidebar({ isOpen, closeSidebar }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Chiudi la sidebar quando si cambia pagina (solo mobile)
  useEffect(() => {
    closeSidebar();
  }, [location, closeSidebar]);
  
  // Chiudi la sidebar quando si preme ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSidebar();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeSidebar]);
  
  // Disabilita lo scrolling del body quando la sidebar è aperta
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Verifica lo stato di autenticazione
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });
  
  const isLoggedIn = Boolean(user);
  
  // Mutation per il logout
  const logoutMutation = useMutation({
    mutationFn: () => {
      return apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      toast({
        title: 'Logout completato',
        description: 'Hai effettuato il logout con successo'
      });
      // Redirect alla home
      window.location.href = '/';
    }
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
    closeSidebar();
  };
  
  // Elementi di navigazione principale
  const navItems = [
    { 
      label: "Dashboard", 
      href: "/", 
      icon: <Home className="h-5 w-5 mr-3" /> 
    },
    { 
      label: "Documenti Obsoleti", 
      href: "/obsoleti", 
      icon: <FileArchive className="h-5 w-5 mr-3" /> 
    },
    { 
      label: "Chi Siamo", 
      href: "/chi-siamo", 
      icon: <Info className="h-5 w-5 mr-3" /> 
    },
    { 
      label: "Assistenza", 
      href: "/assistenza", 
      icon: <HelpCircle className="h-5 w-5 mr-3" /> 
    },
  ];
  
  // Elementi per utenti autenticati/non autenticati
  const authItems = isLoggedIn
    ? [
        { 
          label: "Notifiche", 
          href: "/notifiche", 
          icon: <Bell className="h-5 w-5 mr-3" />
        },
        { 
          label: "Profilo", 
          href: "/profilo", 
          icon: <User className="h-5 w-5 mr-3" />
        },
        { 
          label: "Logout", 
          onClick: handleLogout, 
          icon: <LogOut className="h-5 w-5 mr-3" />
        }
      ]
    : [
        { 
          label: "Accedi", 
          href: "/login", 
          icon: <LogIn className="h-5 w-5 mr-3" />
        },
        { 
          label: "Registrati", 
          href: "/register", 
          icon: <UserPlus className="h-5 w-5 mr-3" />,
          highlight: true
        }
      ];
      
  return (
    <>
      {/* Overlay di sfondo per mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:z-0
      `}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-xl font-bold text-blue-800 flex items-center">
              <span className="mr-2">DocGenius</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden"
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Menu principale */}
          <div className="px-2 py-4 flex-1 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a className={`
                    flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors
                    ${location === item.href 
                      ? 'bg-blue-700 text-white' 
                      : 'text-gray-700 hover:bg-gray-100'}
                  `}>
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              ))}
            </div>
            
            {/* Separatore */}
            <div className="border-t my-4" />
            
            {/* Menu autenticazione */}
            <div className="space-y-1">
              {isLoading ? (
                <div className="px-4 py-2">
                  <div className="animate-pulse h-8 bg-gray-200 rounded-md"></div>
                </div>
              ) : (
                <>
                  {authItems.map((item, index) => 
                    item.href ? (
                      <Link key={index} href={item.href}>
                        <a className={`
                          flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors
                          ${item.highlight 
                            ? 'bg-blue-700 text-white hover:bg-blue-800' 
                            : 'text-gray-700 hover:bg-gray-100'}
                        `}>
                          {item.icon}
                          {item.label}
                        </a>
                      </Link>
                    ) : (
                      <Button
                        key={index}
                        variant="ghost"
                        className="flex items-center justify-start w-full px-4 py-3 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
                        onClick={item.onClick}
                      >
                        {item.icon}
                        {item.label}
                      </Button>
                    )
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t text-xs text-gray-500">
            &copy; {new Date().getFullYear()} DocGenius
          </div>
        </div>
      </div>
    </>
  );
}