import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Server,
  Database,
  ShieldCheck,
  User,
  ShieldAlert,
  Lock,
  ArrowRight
} from 'lucide-react';
import { getHealthStatus, getReadinessStatus, authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();

  const [healthData, setHealthData] = useState(null);
  const [readyData, setReadyData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingReady, setLoadingReady] = useState(false);
  const [healthError, setHealthError] = useState(null);
  const [readyError, setReadyError] = useState(null);

  // RBAC interactive probe state
  const [adminProbeResult, setAdminProbeResult] = useState(null);
  const [probingAdmin, setProbingAdmin] = useState(false);

  const checkHealth = async () => {
    setLoadingHealth(true);
    setHealthError(null);
    try {
      const data = await getHealthStatus();
      setHealthData(data);
    } catch (err) {
      setHealthError(err.message || 'Failed to reach /api/health');
      setHealthData(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  const checkReady = async () => {
    setLoadingReady(true);
    setReadyError(null);
    try {
      const data = await getReadinessStatus();
      setReadyData(data);
    } catch (err) {
      setReadyError(err.message || 'Database not ready (503 Service Unavailable)');
      setReadyData(null);
    } finally {
      setLoadingReady(false);
    }
  };

  const testAdminAccess = async () => {
    setProbingAdmin(true);
    setAdminProbeResult(null);
    try {
      const res = await authApi.testAdminAccess();
      setAdminProbeResult({
        success: true,
        status: 200,
        message: res.message || 'Admin authorized',
        data: res,
      });
    } catch (err) {
      setAdminProbeResult({
        success: false,
        status: err.status || 403,
        message: err.message,
      });
    } finally {
      setProbingAdmin(false);
    }
  };

  useEffect(() => {
    checkHealth();
    checkReady();
  }, []);

  return (
    <div className="min-h-full py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
          Phase 2: Authentication & Role-Based Access Control
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Joineazy Management Platform
        </h1>
        <p className="mt-2 text-slate-600 max-w-3xl text-sm sm:text-base">
          Production-quality academic system supporting Students and Professors (Admins) with strict role segregation, JWT authentication, and versioned PostgreSQL migrations.
        </p>
      </div>

      {/* User Session Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center">
          <User className="w-5 h-5 mr-2 text-brand-600" />
          Current Session State
        </h2>

        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">User</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{user.full_name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Assigned Role</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase font-semibold">Account ID</span>
                <p className="text-xs font-mono text-slate-600 mt-1 truncate" title={user.id}>
                  {user.id}
                </p>
              </div>
            </div>

            {/* Live Role-Based Access Control Verification Probe */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center">
                    <Lock className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Role-Based Access Control (RBAC) Probe
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Test access to the protected admin route <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200 text-indigo-900">GET /api/admin/test</code> using your current token.
                  </p>
                </div>
                <button
                  onClick={testAdminAccess}
                  disabled={probingAdmin}
                  className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${probingAdmin ? 'animate-spin' : ''}`} />
                  {probingAdmin ? 'Probing...' : 'Probe Admin Route'}
                </button>
              </div>

              {adminProbeResult && (
                <div
                  className={`mt-3 p-4 rounded-xl text-xs flex items-start space-x-2.5 border ${
                    adminProbeResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {adminProbeResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">
                      HTTP {adminProbeResult.status} {adminProbeResult.success ? 'OK' : 'Access Restricted'}:
                    </span>{' '}
                    {adminProbeResult.message}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Unauthenticated Guest</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Register a new student account or sign in to verify session restoration and role-based permissions.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Register as Student
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Dual Diagnostic Monitor: /health & /ready */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* /api/health Monitor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Process Health</span>
                <h3 className="text-base font-bold text-slate-900">GET /api/health</h3>
              </div>
              <button
                onClick={checkHealth}
                disabled={loadingHealth}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Health"
              >
                <RefreshCw className={`w-4 h-4 ${loadingHealth ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingHealth && !healthData && (
              <p className="text-xs text-slate-400 py-4">Checking health endpoint...</p>
            )}

            {healthError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <p className="font-semibold">Endpoint unreachable</p>
                <p className="mt-0.5">{healthError}</p>
              </div>
            )}

            {healthData && (
              <div className="space-y-2">
                <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  HTTP 200 OK — Process Healthy
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                  <pre>{JSON.stringify(healthData, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* /api/ready Monitor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Readiness</span>
                <h3 className="text-base font-bold text-slate-900">GET /api/ready</h3>
              </div>
              <button
                onClick={checkReady}
                disabled={loadingReady}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh Readiness"
              >
                <RefreshCw className={`w-4 h-4 ${loadingReady ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingReady && !readyData && (
              <p className="text-xs text-slate-400 py-4">Checking database readiness...</p>
            )}

            {readyError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <div className="flex items-center font-bold text-amber-900 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  HTTP 503 — Database Unavailable
                </div>
                <p className="text-amber-700">{readyError}</p>
                <p className="mt-2 text-[11px] text-amber-600">
                  PostgreSQL is not reachable on the configured host/port.
                </p>
              </div>
            )}

            {readyData && (
              <div className="space-y-2">
                <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  HTTP 200 OK — Database Connected
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono overflow-x-auto">
                  <pre>{JSON.stringify(readyData, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Architecture Progression */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
        <h3 className="text-lg font-bold mb-4">Milestone Progression</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
            <span className="text-emerald-400 font-bold block mb-1">✓ PHASE 1</span>
            <p className="font-semibold text-white">Scaffolding & Health</p>
            <p className="text-slate-400 mt-1">Vite + React, Express, PostgreSQL pool, Dockerfiles.</p>
          </div>
          <div className="p-3 rounded-xl bg-brand-950/60 border border-brand-500/40">
            <span className="text-brand-300 font-bold block mb-1">✓ PHASE 2</span>
            <p className="font-semibold text-white">Auth & RBAC</p>
            <p className="text-slate-300 mt-1">PostgreSQL schema, Zod validation, JWT, Student/Admin roles, /api/ready.</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 opacity-70">
            <span className="text-slate-400 font-bold block mb-1">PHASE 3</span>
            <p className="font-semibold text-white">Groups & Invites</p>
            <p className="text-slate-400 mt-1">Group creation, email invitations, member tracking.</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 opacity-70">
            <span className="text-slate-400 font-bold block mb-1">PHASE 4</span>
            <p className="font-semibold text-white">Assignments</p>
            <p className="text-slate-400 mt-1">Professor assignments, OneDrive submission links.</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 opacity-70">
            <span className="text-slate-400 font-bold block mb-1">PHASE 5</span>
            <p className="font-semibold text-white">Verification</p>
            <p className="text-slate-400 mt-1">Two-step confirmation flow & analytics.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
