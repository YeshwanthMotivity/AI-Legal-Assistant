import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function ClerkDashboard(): ReactNode {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'clerk') {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Clerk Dashboard</h1>
          <p className="text-sm mt-1">Welcome, {user?.email}</p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
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
      </main>
    </div>
  );
}
