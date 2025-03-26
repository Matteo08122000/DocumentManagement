import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <span className="material-icons-round text-primary-600 mr-2">description</span>
            <h1 className="text-xl font-semibold text-gray-900">DocuManager</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <span className="material-icons-round text-sm mr-1">person</span>
              Account
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <span className="material-icons-round text-sm mr-1">settings</span>
              Impostazioni
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
