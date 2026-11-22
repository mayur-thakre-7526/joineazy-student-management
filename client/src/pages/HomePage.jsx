import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Clock,
  Layers,
  Award,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, isAuthenticated, isStudent, isAdmin } = useAuth();

  return (
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Academic Group & Assignment Governance</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Collaborative Coursework,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">
                Seamlessly Managed.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Joineazy is a purpose-built platform connecting students and faculty. Form project groups, access external cloud submission portals, declare milestone completion with two-step verification, and track real-time course analytics.
            </p>

            {/* Dynamic CTA Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md shadow-brand-500/25 hover:shadow-lg"
                  >
                    Go to Your Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                  <Link
                    to="/assignments"
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Browse Assignments
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md shadow-brand-500/25 hover:shadow-lg"
                  >
                    Get Started as Student
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    Sign In to Portal
                  </Link>
                </>
              )}
            </div>

            {/* Authenticated User Status Card */}
            {isAuthenticated && user && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Currently signed in</p>
                    <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}
                  >
                    {user.role === 'ADMIN' ? 'Professor (Admin)' : 'Enrolled Student'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{user.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hero Feature Visual Card */}
          <div className="w-full lg:w-auto lg:flex-1 max-w-lg">
            <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-slate-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-mono text-slate-400">joineazy.portal</span>
              </div>

              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">Active Student Teams</p>
                      <p className="text-sm font-bold text-white">Self-Service Collaboration</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Verified</span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">OneDrive Integration</p>
                      <p className="text-sm font-bold text-white">Cloud File Submission</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-400">Synced</span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">Submission Declarations</p>
                      <p className="text-sm font-bold text-white">Two-Step Verification</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">Audited</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Role-Based Access Control</span>
                <span className="text-brand-400 font-semibold">PostgreSQL Relational DB</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar: Students */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-3">
            <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
            Designed for Learners
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Streamlined Student Experience
          </h2>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Everything students need to collaborate effectively, meet deadlines, and keep track of coursework progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Student Group Formation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Create student project groups, invite peers via institutional email or UUID, and manage membership rosters with automated single-group integrity.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Targeted Coursework</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Access coursework assigned directly to your group or available course-wide, complete with guidelines, due dates, and direct external cloud links.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Two-Step Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Submit files externally to OneDrive, then declare your submission with an explicit confirmation dialog. Instant timestamping and late submission detection.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Pillar: Professors / Admins */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            Faculty & Administrative Oversight
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Powerful Professor Console
          </h2>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            Equip educators with the control and visibility needed to evaluate submissions and ensure academic progress.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Flexible Assignment Scopes</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Publish coursework for the entire course or target specific project groups. Edit instructions, update deadlines, or re-target groups on the fly.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Real-Time Class Analytics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track course-wide submission progress, on-time delivery rates, and pending assignments at a glance with aggregate metric cards and status progress bars.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Submission Drilldown</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspect individual student declarations, confirmed timestamps, late flags, and group-level completion status with instant roster search and filtering.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Workflow */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
              Architecture & Lifecycle
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-1">
              How Joineazy Works
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              From assignment distribution to audited declaration in four simple stages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-400">STEP 01</span>
              <h4 className="text-base font-bold text-white">Create & Target</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Professors publish assignments with OneDrive upload links, setting scope for all students or specific groups.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-400">STEP 02</span>
              <h4 className="text-base font-bold text-white">Collaborate in Teams</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Students form project teams, invite members, and access applicable coursework from their personalized dashboard.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-400">STEP 03</span>
              <h4 className="text-base font-bold text-white">Submit to OneDrive</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Students launch external OneDrive links directly to deposit deliverables into professor cloud storage.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-mono font-bold text-brand-400">STEP 04</span>
              <h4 className="text-base font-bold text-white">Confirm & Track</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Students confirm declarations via a two-step dialog, immediately updating group progress and professor analytics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Ready to manage course assignments?
            </h3>
            <p className="text-sm text-white/80">
              Sign in with your academic credentials or register a student account to get started immediately.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-brand-600 bg-white hover:bg-slate-100 transition-colors shadow-md"
              >
                Access Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-brand-600 bg-white hover:bg-slate-100 transition-colors shadow-md"
                >
                  Register as Student
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-white/20 hover:bg-white/30 border border-white/30 transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
