import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Layers, Server, Database, ShieldCheck, ArrowRight } from 'lucide-react';
import { getHealthStatus } from '../services/api';

export default function HomePage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealthStatus();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to connect to backend API');
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20">
              JZ
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Joineazy</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                Phase 1 Scaffolding
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-sm text-slate-500">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Frontend Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        {/* Hero Section */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Student, Group & Assignment Management System
          </h1>
          <p className="mt-2 text-lg text-slate-600 max-w-3xl">
            A production-quality, role-based platform designed for modern academic workflows. Phase 1 establishes the verified full-stack architecture, containerization setup, and health monitoring baseline.
          </p>
        </div>

        {/* Stack Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Client Frontend</h3>
            <p className="text-sm text-slate-500 mt-1">
              React 18, Vite build tool, and Tailwind CSS with custom branding design tokens.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Status</span>
              <span className="text-emerald-600 font-medium">Compiled & Running</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Backend API</h3>
            <p className="text-sm text-slate-500 mt-1">
              Node.js & Express.js with modular routing, security headers (Helmet), CORS, and structured logging.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Port</span>
              <span className="font-mono text-slate-600">5000</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">PostgreSQL Service</h3>
            <p className="text-sm text-slate-500 mt-1">
              Containerized PostgreSQL 16 Alpine configuration with connection pooling and health diagnostics.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Port</span>
              <span className="font-mono text-slate-600">5432</span>
            </div>
          </div>
        </div>

        {/* Live Health Check Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Diagnostic Monitor</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Backend & Database Connectivity</h2>
              <p className="text-sm text-slate-500">Live test of the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">GET /api/health</code> endpoint.</p>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Probing...' : 'Re-check Status'}
            </button>
          </div>

          <div className="mt-6">
            {loading && !healthData && (
              <div className="py-8 text-center text-slate-500 text-sm">
                Connecting to backend service...
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Backend endpoint unreachable</p>
                  <p className="mt-0.5 text-amber-700">{error}</p>
                  <p className="mt-2 text-xs text-amber-600">
                    Ensure the backend server is running (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">npm run dev</code> inside <code className="font-mono">/server</code>).
                  </p>
                </div>
              </div>
            )}

            {healthData && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium">Backend responded successfully with HTTP 200 OK</span>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto">
                  <pre>{JSON.stringify(healthData, null, 2)}</pre>
                </div>
              </div>
            )}

            {lastChecked && (
              <p className="text-xs text-slate-400 mt-4 text-right">
                Last checked at {lastChecked}
              </p>
            )}
          </div>
        </div>

        {/* Phase Roadmap */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex items-center space-x-2 text-brand-300 mb-2 text-xs uppercase font-bold tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Implementation Progression</span>
          </div>
          <h3 className="text-2xl font-bold">Phase 1 Complete: Next Milestones</h3>
          <p className="text-slate-300 text-sm mt-1 mb-6">
            The foundation is verified. Upcoming development phases will systematically deliver the core requirements:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-white/10 border border-white/10">
              <span className="text-brand-300 font-mono text-xs font-bold block mb-1">PHASE 2</span>
              <p className="font-semibold">Auth & RBAC</p>
              <p className="text-xs text-slate-300 mt-1">JWT authentication with strict Student and Professor (Admin) separation.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-white/10">
              <span className="text-brand-300 font-mono text-xs font-bold block mb-1">PHASE 3</span>
              <p className="font-semibold">Groups & Invites</p>
              <p className="text-xs text-slate-300 mt-1">Group creation, email/ID member invitations, and membership management.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-white/10">
              <span className="text-brand-300 font-mono text-xs font-bold block mb-1">PHASE 4</span>
              <p className="font-semibold">Assignments & OneDrive</p>
              <p className="text-xs text-slate-300 mt-1">Professor assignment distribution and external OneDrive submission links.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-white/10">
              <span className="text-brand-300 font-mono text-xs font-bold block mb-1">PHASE 5</span>
              <p className="font-semibold">Two-Step Verification</p>
              <p className="text-xs text-slate-300 mt-1">Two-step confirmation flow, progress tracking, and analytics dashboards.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>Joineazy &copy; {new Date().getFullYear()} — Student, Group & Assignment Management Platform</p>
      </footer>
    </div>
  );
}
