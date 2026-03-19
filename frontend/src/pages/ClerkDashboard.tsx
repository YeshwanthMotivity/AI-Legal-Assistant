import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';

export default function ClerkDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <PortalLayout title="Clerk Dashboard" subtitle={`Welcome, ${user?.email || ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Case Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Case Management</h2>
          <p className="text-gray-600">Track and manage case documents</p>
        </div>

        {/* Document Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Document Upload</h2>
          <p className="text-gray-600">Upload and organize case documents</p>
        </div>

        {/* Case Assignment */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Case Assignment</h2>
          <p className="text-gray-600">Assign cases to judges</p>
        </div>
      </div>
    </PortalLayout>
  );
}
