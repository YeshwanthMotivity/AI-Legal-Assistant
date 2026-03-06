import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AdminDashboard(): ReactNode {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-purple-600 text-white p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm mt-1">Welcome, {user?.email}</p>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
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
      </main>
    </div>
  );
}
