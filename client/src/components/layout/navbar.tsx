import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  Home, 
  LogIn, 
  UserPlus, 
  LogOut, 
  FileArchive, 
  Bell, 
  User,
  HelpCircle,
  Info
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verifica lo stato di autenticazione
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minuti
    enabled: true,
    onSettled: (data, error) => {
      if (data && !error) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    }
  });

  // Mutation per il logout
  const logoutMutation = useMutation({
    mutationFn: () => {
      return apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      setIsLoggedIn(false);
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
  };

  const navItems = [
    { label: "Dashboard", href: "/", icon: <Home className="h-4 w-4 mr-2" /> },
    { label: "Documenti Obsoleti", href: "/obsoleti", icon: <FileArchive className="h-4 w-4 mr-2" /> },
    { label: "Chi Siamo", href: "/chi-siamo", icon: <Info className="h-4 w-4 mr-2" /> },
    { label: "Assistenza", href: "/assistenza", icon: <HelpCircle className="h-4 w-4 mr-2" /> },
  ];

  const authItems = isLoggedIn
    ? [
        { 
          label: "Notifiche", 
          href: "/notifiche", 
          icon: <Bell className="h-4 w-4 mr-2" />,
          className: "text-white" 
        },
        { 
          label: "Profilo", 
          href: "/profilo", 
          icon: <User className="h-4 w-4 mr-2" />,
          className: "text-white" 
        },
        { 
          label: "Logout", 
          onClick: handleLogout, 
          icon: <LogOut className="h-4 w-4 mr-2" />,
          className: "text-white" 
        }
      ]
    : [
        { 
          label: "Accedi", 
          href: "/login", 
          icon: <LogIn className="h-4 w-4 mr-2" />,
          className: "text-white" 
        },
        { 
          label: "Registrati", 
          href: "/register", 
          icon: <UserPlus className="h-4 w-4 mr-2" />,
          className: "text-white font-bold bg-blue-700 hover:bg-blue-800" 
        }
      ];

  return (
    <>
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/">
                  <a className="text-xl font-bold flex items-center">
                    <span className="material-icons-round mr-2">description</span>
                    DocGenius
                  </a>
                </Link>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <a
                        className={`${
                          location === item.href
                            ? "bg-blue-900 text-white"
                            : "text-white hover:bg-blue-700"
                        } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                      >
                        {item.icon}
                        {item.label}
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              {isLoading ? (
                <div className="animate-pulse h-8 w-16 bg-blue-700 rounded-md"></div>
              ) : (
                <>
                  {/* Desktop menu for auth */}
                  <div className="hidden md:flex space-x-2">
                    {authItems.map((item, index) => 
                      item.href ? (
                        <Link key={index} href={item.href}>
                          <a
                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${item.className || ''}`}
                          >
                            {item.icon}
                            {item.label}
                          </a>
                        </Link>
                      ) : (
                        <Button
                          key={index}
                          variant="ghost"
                          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${item.className || ''}`}
                          onClick={item.onClick}
                        >
                          {item.icon}
                          {item.label}
                        </Button>
                      )
                    )}
                  </div>
                </>
              )}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`${
                      location === item.href
                        ? "bg-blue-900 text-white"
                        : "text-white hover:bg-blue-700"
                    } flex items-center px-3 py-2 rounded-md text-base font-medium`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              ))}
              
              {/* Auth items mobile */}
              <div className="border-t border-blue-700 pt-2 mt-2">
                {authItems.map((item, index) => 
                  item.href ? (
                    <Link key={index} href={item.href}>
                      <a
                        className="flex items-center px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.icon}
                        {item.label}
                      </a>
                    </Link>
                  ) : (
                    <Button
                      key={index}
                      variant="ghost"
                      className="flex items-center w-full justify-start px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
                      onClick={() => {
                        item.onClick && item.onClick();
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
