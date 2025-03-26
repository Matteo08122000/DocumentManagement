import React from 'react';
import { Link, useLocation } from 'wouter';

const Sidebar: React.FC = () => {
  const [location] = useLocation();
  
  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
            <Link href="/">
              <a className={`${location === '/' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                <span className="material-icons-round mr-3 h-6 w-6">dashboard</span>
                Dashboard
              </a>
            </Link>
            <Link href="/documenti">
              <a className={`${location === '/documenti' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                <span className="material-icons-round mr-3 h-6 w-6">folder</span>
                Documenti
              </a>
            </Link>
            <Link href="/obsoleti">
              <a className={`${location === '/obsoleti' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                <span className="material-icons-round mr-3 h-6 w-6">history</span>
                Obsoleti
              </a>
            </Link>
            <Link href="/notifiche">
              <a className={`${location === '/notifiche' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} group flex items-center px-2 py-2 text-sm font-medium rounded-md`}>
                <span className="material-icons-round mr-3 h-6 w-6">notifications</span>
                Notifiche
              </a>
            </Link>
          </nav>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
