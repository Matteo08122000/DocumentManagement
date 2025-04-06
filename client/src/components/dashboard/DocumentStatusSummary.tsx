import React from "react";
import { useQuery } from "@tanstack/react-query";

type Statistics = {
  valid: number;
  expiring: number;
  expired: number;
  obsolete: number;
  total: number;
};

const DocumentStatusSummary: React.FC = () => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white overflow-hidden shadow rounded-lg h-24"
          ></div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="material-icons-round text-red-400">error</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Errore nel caricamento delle statistiche
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <span className="material-icons-round text-green-600">
                check_circle
              </span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-black-500 truncate cursor-pointer">
                  Documenti Validi
                </dt>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <span className="material-icons-round text-yellow-600">
                warning
              </span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-black-500 truncate cursor-pointer">
                  In Scadenza
                </dt>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
              <span className="material-icons-round text-red-600">error</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-black-500 truncate cursor-pointer">
                  Scaduti
                </dt>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <span className="material-icons-round text-blue-600">
                history
              </span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-black-500 truncate cursor-pointer">
                  Documenti Obsoleti
                </dt>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentStatusSummary;
