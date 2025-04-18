import React from "react";
import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              DocGenius
            </h3>
            <p className="text-sm text-gray-600">
              Gestione documenti semplice, efficiente e completa per la tua
              azienda.
            </p>
          </div>

          <div className="col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Collegamenti Rapidi
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <a className="text-sm text-gray-600 hover:text-blue-600">
                    Dashboard
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/obsoleti">
                  <a className="text-sm text-gray-600 hover:text-blue-600">
                    Documenti Obsoleti
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/chi-siamo">
                  <a className="text-sm text-gray-600 hover:text-blue-600">
                    Chi Siamo
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Supporto
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/assistenza">
                  <a className="text-sm text-gray-600 hover:text-blue-600">
                    Assistenza
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/assistenza#faq">
                  <a className="text-sm text-gray-600 hover:text-blue-600">
                    FAQ
                  </a>
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Account
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/login">
                  <span className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                    Accedi
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} DocGenius. Tutti i diritti riservati.
          </p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a
              href="https://www.facebook.com/?locale2=it_IT&_rdr"
              className="text-gray-500 hover:text-blue-600"
            >
              <span className="sr-only">Facebook</span>
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/checkpoint/rm/sign-in-another-account?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin"
              className="text-gray-500 hover:text-blue-600"
            >
              <span className="sr-only">LinkedIn</span>
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
