import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';

export default function ClerkDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <PortalLayout title="Clerk Dashboard" subtitle={`Welcome, ${user?.email || ''}`}>
      <div className="grid-dashboard">
        {/* Case Management */}
        <div className="card">
          <h2 className="card-title">Case Management</h2>
          <p className="text-gray-600">Track and manage case documents</p>
        </div>

        {/* Document Upload */}
        <div className="card">
          <h2 className="card-title">Document Upload</h2>
          <p className="text-gray-600">Upload and organize case documents</p>
        </div>

        {/* Case Assignment */}
        <div className="card">
          <h2 className="card-title">Case Assignment</h2>
          <p className="text-gray-600">Assign cases to judges</p>
        </div>
      </div>
    </PortalLayout>
  );
}
