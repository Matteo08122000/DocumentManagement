import { CheckCircle, AlertTriangle, XCircle, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusSummaryProps {
  stats?: {
    valid: number;
    expiring: number;
    expired: number;
    obsolete: number;
  };
}

export default function StatusSummary({ stats }: StatusSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <CheckCircle className="text-green-600 h-6 w-6" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Documenti Validi
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {stats ? stats.valid : <Skeleton className="h-6 w-12" />}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <AlertTriangle className="text-yellow-600 h-6 w-6" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  In Scadenza
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {stats ? stats.expiring : <Skeleton className="h-6 w-12" />}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
              <XCircle className="text-red-600 h-6 w-6" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Documenti Scaduti
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {stats ? stats.expired : <Skeleton className="h-6 w-12" />}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <Archive className="text-blue-600 h-6 w-6" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Documenti Obsoleti
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {stats ? stats.obsolete : <Skeleton className="h-6 w-12" />}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
