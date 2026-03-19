import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import PortalLayout from '../components/layout/PortalLayout';

export default function JudgeDashboard(): ReactNode {
  const { user } = useAuth();

  return (
    <PortalLayout title="Judge Dashboard" subtitle={`Welcome, ${user?.email || ''}`}>
      <div className="grid-dashboard">
        {/* Cases Overview */}
        <div className="card">
          <h2 className="card-title">Active Cases</h2>
          <p className="text-gray-600">View and manage assigned cases</p>
        </div>

        {/* Analysis Tools */}
        <div className="card">
          <h2 className="card-title">AI Analysis Tools</h2>
          <p className="text-gray-600">Analyze documents and generate summaries</p>
        </div>

        {/* Judgments */}
        <div className="card">
          <h2 className="card-title">Draft Judgments</h2>
          <p className="text-gray-600">Review and finalize AI-generated judgments</p>
        </div>
      </div>
    </PortalLayout>
  );
}
