import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';

export default function AdminDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <PortalLayout title="Admin Dashboard" subtitle={`Welcome, ${user?.email || ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">User Management</h2>
          <p className="text-gray-600">Create, edit, and manage users</p>
        </div>

        {/* System Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Metrics</h2>
          <p className="text-gray-600">View performance and usage metrics</p>
        </div>

        {/* Audit Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
          <p className="text-gray-600">Review system audit and activity logs</p>
        </div>
      </div>
    </PortalLayout>
  );
}
