import { useState } from "react";
import { Route, Switch, Link } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Obsolete from "@/pages/Obsolete";
import Notifications from "@/pages/Notifications";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AboutUs from "@/pages/AboutUs";
import Support from "@/pages/Support";
import Footer from "@/components/layout/footer";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import useIdleTimer from "@/hooks/useIdleTimer";

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  useIdleTimer(15 * 60 * 1000, () => {
    if (isAuthenticated) {
      logout();
    }
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-900 text-white shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Desktop navbar */}
            <div className="flex items-center space-x-1">
              <Link href="/">
                <span className="text-xl font-bold cursor-pointer mr-4">
                  DocGenius
                </span>
              </Link>
              <div className="hidden sm:flex items-center">
                <Link href="/">
                  <span className="text-white hover:bg-blue-800 px-3 py-2 rounded text-sm cursor-pointer block">
                    Dashboard
                  </span>
                </Link>
                {isAuthenticated && (
                  <Link href="/obsoleti">
                    <span className="text-white hover:bg-blue-800 px-3 py-2 rounded text-sm cursor-pointer block">
                      Documenti Obsoleti
                    </span>
                  </Link>
                )}
                <Link href="/chi-siamo">
                  <span className="text-white hover:bg-blue-800 px-3 py-2 rounded text-sm cursor-pointer block">
                    Chi Siamo
                  </span>
                </Link>
                <Link href="/assistenza">
                  <span className="text-white hover:bg-blue-800 px-3 py-2 rounded text-sm cursor-pointer block">
                    Assistenza
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="sm:hidden text-white"
                onClick={toggleSidebar}
              >
                <Menu className="h-6 w-6" />
              </Button>
              {isAuthenticated && (
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="text-white px-3 py-2 text-sm">
                    <User className="h-4 w-4 inline mr-1" />
                    {user?.username}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-blue-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Esci
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Mobile sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg p-4 flex flex-col">
            <div className="flex justify-between items-center mb-5 pb-3 border-b">
              <Link href="/">
                <span className="font-bold text-xl text-blue-800 cursor-pointer">
                  DocGenius
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 flex flex-col space-y-1">
              <Link href="/">
                <span className="px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-md block cursor-pointer">
                  Dashboard
                </span>
              </Link>
              {isAuthenticated && (
                <Link href="/obsoleti">
                  <span className="px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-md block cursor-pointer">
                    Documenti Obsoleti
                  </span>
                </Link>
              )}
              <Link href="/chi-siamo">
                <span className="px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-md block cursor-pointer">
                  Chi Siamo
                </span>
              </Link>
              <Link href="/assistenza">
                <span className="px-3 py-3 text-gray-700 hover:bg-gray-100 rounded-md block cursor-pointer">
                  Assistenza
                </span>
              </Link>
              <div className="border-t my-3"></div>
              {isAuthenticated && (
                <>
                  <div className="px-3 py-2 text-gray-700">
                    <User className="h-4 w-4 inline mr-1" />
                    {user?.username}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center justify-start px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    <span>Esci</span>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
      {/* Main content */}
      <main className="flex-1 py-6 px-4">
        <div className="container mx-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/obsoleti" component={Obsolete} />
            <Route path="/notifiche" component={Notifications} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/chi-siamo" component={AboutUs} />
            <Route path="/assistenza" component={Support} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
}

function MainApp() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

export default MainApp;
