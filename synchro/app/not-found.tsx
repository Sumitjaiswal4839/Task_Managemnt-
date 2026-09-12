import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <FileQuestion className="h-6 w-6 text-gray-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h2>
        <p className="text-sm text-gray-500 mb-6">
          We couldn&apos;t find the page you were looking for. It might have been moved or deleted.
        </p>
        <Link
          href="/dashboard"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
