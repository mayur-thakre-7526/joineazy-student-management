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
  Crown,
  Inbox,
  Sparkles,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user, pendingInvitesCount } = useAuth();
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
        <p className="text-sm font-medium">Calculating your coursework progress...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Unable to Load Progress</h2>
        <p className="text-xs text-slate-600 mt-2">{error || 'Could not retrieve coursework data.'}</p>
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
      {/* Pending Invitations Alert Banner */}
      {pendingInvitesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Invitation Alert</p>
              <p className="text-sm font-semibold">
                You have {pendingInvitesCount} pending group {pendingInvitesCount === 1 ? 'invitation' : 'invitations'} awaiting your response.
              </p>
            </div>
          </div>
          <Link
            to="/invitations"
            className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors self-start sm:self-auto shrink-0"
          >
            Review Invitations &rarr;
          </Link>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-brand-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white inline-block">
              Student Academic Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name}!
            </h1>
            <p className="text-sm text-white/80 max-w-xl leading-relaxed">
              Track course assignments, submit individual or group deliverables to external OneDrive links, and monitor your coursework progress.
            </p>
            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link
                to="/courses"
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 backdrop-blur-sm transition-colors flex items-center"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Browse Courses
              </Link>
              <Link
                to="/assignments"
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 backdrop-blur-sm transition-colors flex items-center"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                View Assignments
              </Link>
              <Link
                to="/group"
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 backdrop-blur-sm transition-colors flex items-center"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                My Team Group
              </Link>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 flex flex-col items-center justify-center min-w-[200px] text-center self-start md:self-auto">
            <div className="w-14 h-14 rounded-2xl bg-white text-brand-600 flex items-center justify-center font-extrabold text-xl shadow-md mb-2">
              {summary.completion_percentage}%
            </div>
            <p className="text-[11px] text-white/70 uppercase font-bold tracking-wider">Overall Completion</p>
            <p className="text-xs font-semibold text-white mt-0.5">
              {summary.confirmed_assignments} of {summary.total_assignments} Deliverables Done
            </p>
            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2.5 overflow-hidden">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${summary.completion_percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards (5 metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Enrolled Courses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Courses</span>
            <BookOpen className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{enrolledCourses.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Enrolled modules</p>
        </div>

        {/* Assigned Coursework */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{summary.total_assignments}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active deliverables</p>
        </div>

        {/* Confirmed Submissions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{summary.confirmed_assignments}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.late_confirmations > 0 ? `${summary.late_confirmations} submitted late` : 'All on-time'}
          </p>
        </div>

        {/* Pending Submissions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{summary.pending_assignments}</p>
          <p className="text-[11px] text-slate-500 mt-1">Needs submission</p>
        </div>

        {/* Completion Percentage */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Progress</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-purple-600">{summary.completion_percentage}%</p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${summary.completion_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Enrolled Courses Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-brand-600" />
              My Enrolled Courses ({enrolledCourses.length})
            </h2>
            <p className="text-xs text-slate-500">Academic modules you are actively enrolled in</p>
          </div>
          <Link to="/courses" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center">
            Course Catalog
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {enrolledCourses.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-600">You have not enrolled in any academic courses yet.</p>
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              Enter Enrollment Code &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledCourses.map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className="group p-5 bg-slate-50 hover:bg-brand-50/50 border border-slate-200 hover:border-brand-300 rounded-xl transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-brand-100 text-brand-800 border border-brand-200">
                      {c.course_code}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Prof. {c.professor_name}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors mt-2">
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center font-medium">
                    <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {c.assignment_count} {c.assignment_count === 1 ? 'Assignment' : 'Assignments'}
                  </span>
                  <span className="font-bold text-brand-600 group-hover:translate-x-1 transition-transform flex items-center">
                    View Course
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Group Progress Section */}
      {group ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Group: {group.group_name}</span>
                  {group.is_creator && (
                    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      <Crown className="w-3 h-3 mr-1 text-amber-600" />
                      Group Leader
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500">
                  {group.member_count} Active {group.member_count === 1 ? 'Member' : 'Members'} • Team Deliverable Completion: {group.overall_progress_percentage}%
                </p>
              </div>
            </div>
            <Link
              to="/group"
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center self-start sm:self-auto"
            >
              Manage Team Roster
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {/* Per-Assignment Group Progress Cards */}
          {group.assignments_progress.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No coursework assigned to your group at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.assignments_progress.map((ga) => (
                <div key={ga.assignment_id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 truncate">{ga.title}</h3>
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
          <h2 className="text-sm font-bold text-slate-900">You are not a member of any group yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Form or join a student team to collaborate on targeted coursework deliverables and track group completion metrics.
          </p>
          <div className="pt-2">
            <Link
              to="/group"
              className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              Create or Join Group &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming Assigned Coursework */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Coursework ({assignments.length})</h2>
            <p className="text-xs text-slate-500">Assignments targeted to you or your active student group</p>
          </div>
          <Link to="/assignments" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center">
            All Assignments
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
              const isPastDue = dueDate < new Date();

              return (
                <div key={a.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.course_code && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                          {a.course_code}
                        </span>
                      )}
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
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {a.scope === 'ALL' ? 'Course-wide' : 'Targeted Group'}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span className={`flex items-center ${isPastDue && a.status === 'PENDING' ? 'text-red-600 font-semibold' : ''}`}>
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Due: {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isPastDue && a.status === 'PENDING' && ' (Past Deadline)'}
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
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                    >
                      View Details &rarr;
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
