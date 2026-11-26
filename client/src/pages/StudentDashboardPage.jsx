import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { submissionApi, courseApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  ArrowRight,
  TrendingUp,
  Loader2,
  Award,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProgress() {
      try {
        setLoading(true);
        setError(null);
        const [progressRes, coursesRes] = await Promise.all([
          submissionApi.getStudentProgress(),
          courseApi.getMyCourses(),
        ]);
        setData(progressRes);
        setEnrolledCourses(coursesRes.courses || []);
      } catch (err) {
        setError(err.message || 'Failed to load coursework progress.');
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Calculating your coursework progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Unable to Load Progress</h3>
        <p className="text-xs text-slate-600 mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, assignments, group } = data;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-brand-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white inline-block mb-2">
              Student Academic Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name}!
            </h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl">
              Track your course assignments, launch external OneDrive submission portals, and review your personal and group completion metrics.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center space-x-4 self-start md:self-auto">
            <div className="w-12 h-12 rounded-xl bg-white text-brand-600 flex items-center justify-center font-bold text-lg shadow-md">
              {summary.completion_percentage}%
            </div>
            <div>
              <p className="text-xs text-white/70 uppercase font-semibold tracking-wider">Overall Progress</p>
              <p className="text-sm font-bold text-white">
                {summary.confirmed_assignments} of {summary.total_assignments} Completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Assigned</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{summary.total_assignments}</p>
          <p className="text-[11px] text-slate-500 mt-1">Applicable coursework</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{summary.confirmed_assignments}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.late_confirmations > 0 ? `${summary.late_confirmations} submitted late` : 'All on-time'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{summary.pending_assignments}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting declaration</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completion</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-600">{summary.completion_percentage}%</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${summary.completion_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section (Round 2) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-brand-600" />
              Your Enrolled Courses
            </h3>
            <p className="text-xs text-slate-500">Academic modules you are actively attending</p>
          </div>
          <Link to="/courses" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center">
            View All Courses
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            <p>You have not enrolled in any courses yet.</p>
            <Link to="/courses" className="mt-2 inline-block font-semibold text-brand-600 hover:underline">
              Enter an enrollment code to join a course &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className="group p-4 bg-slate-50 hover:bg-brand-50/50 border border-slate-200 hover:border-brand-200 rounded-xl transition-all space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      {c.course_code}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Prof. {c.professor_name}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors mt-2">
                    {c.title}
                  </h4>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{c.assignment_count} Coursework</span>
                  <span className="font-semibold text-brand-600 group-hover:translate-x-0.5 transition-transform">
                    Open &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Group Progress Section (If In Group) */}
      {group ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Group Progress: <span className="text-purple-600">{group.group_name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {group.member_count} Active {group.member_count === 1 ? 'Member' : 'Members'} • Aggregate Completion: {group.overall_progress_percentage}%
                </p>
              </div>
            </div>
            <Link
              to="/group"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center self-start sm:self-auto"
            >
              Manage Group Roster
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {/* Per-Assignment Group Progress Cards */}
          {group.assignments_progress.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No coursework assigned to your group yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.assignments_progress.map((ga) => (
                <div key={ga.assignment_id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{ga.title}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        ga.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : ga.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {ga.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {ga.confirmed_members} of {ga.total_members} members confirmed
                    </span>
                    <span className="font-bold text-slate-700">{ga.progress_percentage}%</span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        ga.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${ga.progress_percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-1" />
          <h3 className="text-sm font-bold text-slate-900">You are not in a group yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Form or join a student team to collaborate on targeted coursework and view group completion metrics.
          </p>
          <div className="pt-2">
            <Link
              to="/group"
              className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              Create or Join Group
            </Link>
          </div>
        </div>
      )}

      {/* Course Assignments List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Assigned Coursework</h3>
            <p className="text-xs text-slate-500">Assignments targeted to you or your student group</p>
          </div>
          <Link to="/assignments" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            View All
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No coursework assigned to you at this time.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map((a) => {
              const dueDate = new Date(a.due_date);
              return (
                <div key={a.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          a.submission_type === 'GROUP'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {a.submission_type === 'GROUP' ? 'Group Task' : 'Individual'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          a.scope === 'ALL'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {a.scope === 'ALL' ? 'Open to All' : 'Targeted Group'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{a.title}</h4>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Due: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-start sm:self-center">
                    {a.status === 'CONFIRMED' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Confirmed
                      </span>
                    )}
                    {a.status === 'CONFIRMED_LATE' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Confirmed Late
                      </span>
                    )}
                    {a.status === 'OVERDUE' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-300">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600" />
                        Overdue
                      </span>
                    )}
                    {a.status === 'PENDING' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Pending
                      </span>
                    )}

                    <Link
                      to={`/assignments/${a.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
