import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';

export default function AdminDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <PortalLayout title="Admin Dashboard" subtitle={`Welcome, ${user?.email || ''}`}>
      <div className="grid-dashboard">
        {/* User Management */}
        <div className="card">
          <h2 className="card-title">User Management</h2>
          <p className="text-gray-600">Create, edit, and manage users</p>
        </div>

        {/* System Metrics */}
        <div className="card">
          <h2 className="card-title">System Metrics</h2>
          <p className="text-gray-600">View performance and usage metrics</p>
        </div>

        {/* Audit Logs */}
        <div className="card">
          <h2 className="card-title">Audit Logs</h2>
          <p className="text-gray-600">Review system audit and activity logs</p>
        </div>
      </div>
    </PortalLayout>
  );
}
