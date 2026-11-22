import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, ShieldCheck, Users, Inbox, FileText, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isStudent, isAdmin, pendingInvitesCount, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Left Navigation */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              JZ
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                Joineazy
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                Phase 5 Analytics
              </span>
            </div>
          </Link>

          {/* Student Specific Navigation Links */}
          {isAuthenticated && isStudent && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 flex items-center transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Dashboard
              </Link>
              <Link
                to="/assignments"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 flex items-center transition-colors"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Assignments
              </Link>
              <Link
                to="/group"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 flex items-center transition-colors"
              >
                <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                My Group
              </Link>
              <Link
                to="/invitations"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 flex items-center transition-colors relative"
              >
                <Inbox className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Invitations
                {pendingInvitesCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {pendingInvitesCount}
                  </span>
                )}
              </Link>
            </nav>
          )}

          {/* Admin Specific Navigation Links */}
          {isAuthenticated && isAdmin && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 flex items-center transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Dashboard
              </Link>
              <Link
                to="/assignments"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-slate-100 flex items-center transition-colors"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                All Assignments
              </Link>
              <Link
                to="/assignments/create"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 flex items-center transition-colors border border-brand-200"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                New Assignment
              </Link>
            </nav>
          )}
        </div>

        {/* Right User Controls */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-900 leading-tight">
                  {user?.full_name}
                </span>
                <span className="text-xs text-slate-500">{user?.email}</span>
              </div>

              {/* Role Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  user?.role === 'ADMIN'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {user?.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <User className="w-3.5 h-3.5 mr-1" />
                )}
                {user?.role}
              </span>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 hover:text-red-600 focus:outline-none transition-colors"
                title="Sign out of Joineazy"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                Register as Student
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
