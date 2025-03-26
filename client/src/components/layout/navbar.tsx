import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Bell, User } from "lucide-react";
import EmailNotificationModal from "@/components/email-notification-modal";

export default function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/" },
    { label: "Documenti Obsoleti", href: "/obsolete" },
  ];

  return (
    <>
      <nav className="bg-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-xl font-semibold">DocGenius</span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <a
                        className={`${
                          location === item.href
                            ? "bg-primary-dark"
                            : "hover:bg-primary-light"
                        } px-3 py-2 rounded-md text-sm font-medium`}
                      >
                        {item.label}
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-primary-light rounded-full p-1"
                onClick={() => setShowEmailModal(true)}
              >
                <Bell className="h-5 w-5" />
              </Button>
              <div className="ml-3 relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="max-w-xs bg-primary-dark flex items-center text-sm rounded-full p-1"
                >
                  <User className="h-5 w-5" />
                </Button>
              </div>
              <div className="ml-4 md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-primary-light"
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
                        ? "bg-primary-dark"
                        : "hover:bg-primary-light"
                    } block px-3 py-2 rounded-md text-base font-medium`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Email Notification Modal */}
      {showEmailModal && (
        <EmailNotificationModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </>
  );
}
