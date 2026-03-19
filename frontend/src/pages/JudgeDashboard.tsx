import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';

export default function JudgeDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <PortalLayout title="Judge Dashboard" subtitle={`Welcome, ${user?.email || ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Cases Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Active Cases</h2>
          <p className="text-gray-600">View and manage assigned cases</p>
        </div>

        {/* Analysis Tools */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">AI Analysis Tools</h2>
          <p className="text-gray-600">Analyze documents and generate summaries</p>
        </div>

        {/* Judgments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Draft Judgments</h2>
          <p className="text-gray-600">Review and finalize AI-generated judgments</p>
        </div>
      </div>
    </PortalLayout>
  );
}
