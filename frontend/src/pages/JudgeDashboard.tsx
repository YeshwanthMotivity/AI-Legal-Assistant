import { ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function JudgeDashboard(): ReactNode {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (user?.role !== 'judge') {
      navigate('/login');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Judge Dashboard</h1>
            <p className="text-sm mt-1">Welcome, {user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
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
      </main>
    </div>
  );
}
