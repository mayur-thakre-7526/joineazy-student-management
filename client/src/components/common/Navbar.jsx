import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LogOut,
  User,
  ShieldCheck,
  Users,
  Inbox,
  FileText,
  PlusCircle,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isStudent, isAdmin, pendingInvitesCount, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu whenever location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/assignments') return location.pathname === '/assignments';
    if (path === '/assignments/create') return location.pathname === '/assignments/create';
    if (path === '/group') return location.pathname === '/group' || location.pathname.startsWith('/groups');
    if (path === '/invitations') return location.pathname === '/invitations';
    return location.pathname === path;
  };

  const desktopLinkClass = (path) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors ${
      isActive(path)
        ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
        : 'text-slate-700 hover:text-brand-600 hover:bg-slate-100'
    }`;

  const mobileLinkClass = (path) =>
    `px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
      isActive(path)
        ? 'bg-brand-50 text-brand-700 font-bold border border-brand-200'
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              JZ
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
              Joineazy
            </span>
          </Link>

          {/* Student Desktop Navigation Links */}
          {isAuthenticated && isStudent && (
            <nav className="hidden md:flex items-center space-x-1" aria-label="Student Navigation">
              <Link to="/dashboard" className={desktopLinkClass('/dashboard')}>
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Dashboard
              </Link>
              <Link to="/assignments" className={desktopLinkClass('/assignments')}>
                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Assignments
              </Link>
              <Link to="/group" className={desktopLinkClass('/group')}>
                <Users className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                My Group
              </Link>
              <Link to="/invitations" className={`${desktopLinkClass('/invitations')} relative`}>
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

          {/* Admin Desktop Navigation Links */}
          {isAuthenticated && isAdmin && (
            <nav className="hidden md:flex items-center space-x-1" aria-label="Admin Navigation">
              <Link to="/dashboard" className={desktopLinkClass('/dashboard')}>
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Dashboard
              </Link>
              <Link to="/assignments" className={desktopLinkClass('/assignments')}>
                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                All Assignments
              </Link>
              <Link
                to="/assignments/create"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center transition-colors ${
                  isActive('/assignments/create')
                    ? 'bg-brand-600 text-white font-bold shadow-sm'
                    : 'text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200'
                }`}
              >
                <PlusCircle className={`w-3.5 h-3.5 mr-1.5 ${isActive('/assignments/create') ? 'text-white' : 'text-brand-600'}`} />
                New Assignment
              </Link>
            </nav>
          )}
        </div>

        {/* Desktop User Controls */}
        <div className="hidden md:flex items-center space-x-3">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[150px]">
                  {user?.full_name}
                </span>
                <span className="text-[11px] text-slate-500 truncate max-w-[150px]">{user?.email}</span>
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
                className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-red-600 focus:outline-none transition-colors"
                title="Sign out of Joineazy"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2.5">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition-all"
              >
                Register as Student
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Quick Status (Viewports < md) */}
        <div className="flex md:hidden items-center space-x-2">
          {isAuthenticated && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                user?.role === 'ADMIN'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {user?.role}
            </span>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-4 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {/* User Profile Card (if authenticated) */}
          {isAuthenticated && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="truncate mr-2">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  user?.role === 'ADMIN'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {user?.role}
              </span>
            </div>
          )}

          {/* Student Mobile Navigation */}
          {isAuthenticated && isStudent && (
            <nav className="flex flex-col space-y-1" aria-label="Mobile Student Navigation">
              <Link to="/dashboard" className={mobileLinkClass('/dashboard')}>
                <span className="flex items-center">
                  <LayoutDashboard className="w-4 h-4 mr-2 text-slate-500" />
                  Dashboard
                </span>
              </Link>
              <Link to="/assignments" className={mobileLinkClass('/assignments')}>
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-slate-500" />
                  Coursework
                </span>
              </Link>
              <Link to="/group" className={mobileLinkClass('/group')}>
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-slate-500" />
                  My Group
                </span>
              </Link>
              <Link to="/invitations" className={mobileLinkClass('/invitations')}>
                <span className="flex items-center">
                  <Inbox className="w-4 h-4 mr-2 text-slate-500" />
                  Invitations
                </span>
                {pendingInvitesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                    {pendingInvitesCount} pending
                  </span>
                )}
              </Link>
            </nav>
          )}

          {/* Admin Mobile Navigation */}
          {isAuthenticated && isAdmin && (
            <nav className="flex flex-col space-y-1" aria-label="Mobile Admin Navigation">
              <Link to="/dashboard" className={mobileLinkClass('/dashboard')}>
                <span className="flex items-center">
                  <LayoutDashboard className="w-4 h-4 mr-2 text-slate-500" />
                  Dashboard
                </span>
              </Link>
              <Link to="/assignments" className={mobileLinkClass('/assignments')}>
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-slate-500" />
                  All Assignments
                </span>
              </Link>
              <Link to="/assignments/create" className={mobileLinkClass('/assignments/create')}>
                <span className="flex items-center text-brand-600 font-bold">
                  <PlusCircle className="w-4 h-4 mr-2 text-brand-600" />
                  Create Assignment
                </span>
              </Link>
            </nav>
          )}

          {/* Unauthenticated Mobile Actions */}
          {!isAuthenticated && (
            <div className="flex flex-col space-y-2 pt-2">
              <Link
                to="/login"
                className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
              >
                Register as Student
              </Link>
            </div>
          )}

          {/* Mobile Sign Out Action */}
          {isAuthenticated && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2.5 border border-red-200 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
