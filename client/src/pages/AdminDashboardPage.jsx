import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi, courseApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  Search,
  Filter,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  PlusCircle,
  Crown,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [taughtCourses, setTaughtCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected assignment for drilldown tracking
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  // Student search filter
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const [res, coursesRes] = await Promise.all([
          analyticsApi.getAdminAnalytics(),
          courseApi.getMyCourses(),
        ]);
        setAnalytics(res);
        setTaughtCourses(coursesRes.courses || []);
        // Automatically select the first assignment if available and none selected
        if (res.assignments?.length > 0) {
          setSelectedAssignmentId((prev) => prev || res.assignments[0].id);
        }
      } catch (err) {
        setError(err.message || 'Failed to load professor analytics.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  // Fetch detailed tracking when an assignment is selected
  useEffect(() => {
    if (!selectedAssignmentId) {
      setTrackingData(null);
      return;
    }

    let isMounted = true;
    async function fetchTracking() {
      try {
        setTrackingLoading(true);
        setTrackingError(null);
        const res = await analyticsApi.getAssignmentSubmissions(selectedAssignmentId);
        if (isMounted) {
          setTrackingData(res);
        }
      } catch (err) {
        if (isMounted) {
          setTrackingError(err.message || 'Failed to load assignment tracking details.');
        }
      } finally {
        if (isMounted) {
          setTrackingLoading(false);
        }
      }
    }
    fetchTracking();

    return () => {
      isMounted = false;
    };
  }, [selectedAssignmentId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm font-medium">Aggregating academic course analytics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Analytics Unavailable</h2>
        <p className="text-xs text-slate-600 mt-2">{error || 'Could not load course analytics.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const overview = analytics.overview || {};
  const assignments = analytics.assignments || [];

  // Filter students in drilldown safely
  const filteredStudents = (trackingData?.student_tracking || []).filter((s) => {
    const searchLower = studentSearch.toLowerCase();
    const matchesSearch =
      (s.student_name && s.student_name.toLowerCase().includes(searchLower)) ||
      (s.student_email && s.student_email.toLowerCase().includes(searchLower)) ||
      (s.group_name && s.group_name.toLowerCase().includes(searchLower));

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'CONFIRMED') return matchesSearch && s.confirmed;
    if (statusFilter === 'PENDING') return matchesSearch && !s.confirmed;
    if (statusFilter === 'LATE') return matchesSearch && s.is_late;
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 inline-block mb-2">
              Professor Console & Analytics Oversight
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Academic Coursework Oversight
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Inspect student and group confirmation progress, review real-time submission rates, and track deadline compliance across your courses.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <Link
              to="/courses/create"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors flex items-center"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              New Course
            </Link>
            <Link
              to="/assignments/create"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Create Assignment
            </Link>
          </div>
        </div>
      </div>

      {/* Top Overview Cards (6 core metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Courses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Courses</span>
            <BookOpen className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{taughtCourses.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Modules taught</p>
        </div>

        {/* Total Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Students</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{overview.total_students ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Enrolled learners</p>
        </div>

        {/* Total Assignments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Assignments</span>
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{overview.total_assignments ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Published tasks</p>
        </div>

        {/* Confirmed Submissions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Submitted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{overview.total_confirmed_pairs ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {overview.total_late_confirmations > 0 ? `${overview.total_late_confirmations} late` : 'Confirmed tasks'}
          </p>
        </div>

        {/* Pending Submissions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{overview.total_pending_pairs ?? 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting delivery</p>
        </div>

        {/* Overall Completion Percentage */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Completion</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
            {overview.overall_completion_percentage ?? 0}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${overview.overall_completion_percentage ?? 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Courses Taught Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-purple-600" />
              Academic Courses Taught ({taughtCourses.length})
            </h2>
            <p className="text-xs text-slate-500">Student enrollment rosters and course module management</p>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              to="/courses/create"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-brand-600" />
              New Course
            </Link>
            <Link
              to="/courses"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Manage Courses
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
        </div>

        {taughtCourses.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-medium text-slate-600">You have not created any academic courses yet.</p>
            <Link
              to="/courses/create"
              className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              Create Course Module &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {taughtCourses.map((c) => (
              <div
                key={c.id}
                className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 flex flex-col justify-between hover:border-brand-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
                      {c.course_code}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2 truncate">
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Enrolled Students</span>
                    <span className="text-xs font-bold text-slate-900 flex items-center justify-center mt-0.5">
                      <Users className="w-3.5 h-3.5 mr-1 text-blue-500" />
                      {c.student_count ?? 0}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-semibold">Assignments</span>
                    <span className="text-xs font-bold text-slate-900 flex items-center justify-center mt-0.5">
                      <FileText className="w-3.5 h-3.5 mr-1 text-purple-500" />
                      {c.assignment_count ?? 0}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <Link
                    to={`/assignments/create?courseId=${c.id}`}
                    className="font-semibold text-brand-600 hover:text-brand-700"
                  >
                    + Assign Task
                  </Link>
                  <Link
                    to={`/courses/${c.id}`}
                    className="font-semibold text-slate-600 hover:text-slate-900 flex items-center"
                  >
                    Inspect &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Performance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assignment Completion Breakdown</h2>
            <p className="text-xs text-slate-500">Summary metrics across all published course assignments ({assignments.length})</p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No assignments have been published yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600" aria-label="Assignment Completion Breakdown">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Assignment</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4 text-center">Eligible</th>
                  <th className="py-3 px-4 text-center">Confirmed</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4 text-center">Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  const isSelected = selectedAssignmentId === a.id;
                  const dueDate = new Date(a.due_date);
                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-brand-50/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">{a.title}</td>
                      <td className="py-3.5 px-4">
                        {a.course_code ? (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            {a.course_code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">General</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            a.submission_type === 'GROUP'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {a.submission_type === 'GROUP' ? 'Group' : 'Individual'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            a.scope === 'ALL'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {a.scope === 'ALL' ? 'Open to All' : 'Targeted'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold">{a.eligible_students ?? 0}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-emerald-600">
                        {a.confirmed_count ?? 0}
                        {a.late_count > 0 && (
                          <span className="text-[10px] text-amber-600 block">({a.late_count} late)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-amber-600">{a.pending_count ?? 0}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-bold">{a.completion_percentage ?? 0}%</span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-brand-600 h-1.5 rounded-full"
                              style={{ width: `${a.completion_percentage ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedAssignmentId(a.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-brand-600 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? 'Inspecting' : 'Inspect'}
                        </button>
                        <Link
                          to={`/assignments/${a.id}`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          Details &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Drilldown Section */}
      {selectedAssignmentId && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
                Submission Tracking Drilldown
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {trackingData?.assignment?.title || 'Loading assignment details...'}
              </h2>
            </div>

            {trackingData?.overall && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span>Eligible: <strong>{trackingData.overall.eligible_count ?? 0}</strong></span>
                <span>Confirmed: <strong className="text-emerald-600">{trackingData.overall.confirmed_count ?? 0}</strong></span>
                <span>Pending: <strong className="text-amber-600">{trackingData.overall.pending_count ?? 0}</strong></span>
                <span>Completion: <strong className="text-brand-600">{trackingData.overall.completion_percentage ?? 0}%</strong></span>
              </div>
            )}
          </div>

          {trackingError ? (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {trackingError}
            </div>
          ) : trackingLoading || !trackingData ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-brand-600 mb-2" />
              <p className="text-xs">Loading submission records...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group-Wise Progress Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  Group-Wise Progress Tracking ({(trackingData.group_tracking || []).length} Groups)
                </h3>

                {(trackingData.group_tracking || []).length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    No active student groups are targeted for this assignment.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600" aria-label="Group-Wise Progress Tracking">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Group Name</th>
                          <th className="py-2.5 px-4">Group Leader</th>
                          <th className="py-2.5 px-4 text-center">Active Members</th>
                          <th className="py-2.5 px-4 text-center">Confirmed</th>
                          <th className="py-2.5 px-4 text-center">Pending</th>
                          <th className="py-2.5 px-4 text-center">Group Progress</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(trackingData.group_tracking || []).map((g) => (
                          <tr key={g.group_id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {g.group_name}
                              {g.acknowledged && (
                                <span className="block text-[10px] text-emerald-600 font-normal">
                                  ✓ Acknowledged by {g.acknowledged_by_name || g.leader_name}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <span className="flex items-center">
                                <Crown className="w-3 h-3 mr-1 text-amber-500" />
                                {g.leader_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">{g.eligible_count ?? 0}</td>
                            <td className="py-3 px-4 text-center font-semibold text-emerald-600">{g.confirmed_count ?? 0}</td>
                            <td className="py-3 px-4 text-center font-semibold text-amber-600">{g.pending_count ?? 0}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <span className="font-bold">{g.progress_percentage ?? 0}%</span>
                                <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      g.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-purple-600'
                                    }`}
                                    style={{ width: `${g.progress_percentage ?? 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  g.status === 'COMPLETED' || g.status === 'CONFIRMED_LATE'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : g.status === 'IN_PROGRESS'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {g.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Student-Wise Confirmation Roster Table */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center">
                    <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Student-Wise Confirmation Roster ({filteredStudents.length} of {(trackingData.student_tracking || []).length})
                  </h3>

                  {/* Filters */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search student or group..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 w-48"
                      />
                    </div>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500 text-slate-700"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PENDING">Pending</option>
                      <option value="LATE">Late Submissions</option>
                    </select>
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    No student records match the active filter.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600" aria-label="Student-Wise Confirmation Roster">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Student</th>
                          <th className="py-2.5 px-4">Email</th>
                          <th className="py-2.5 px-4">Assigned Group</th>
                          <th className="py-2.5 px-4">Confirmation Status</th>
                          <th className="py-2.5 px-4 text-right">Recorded Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((s) => (
                          <tr key={s.student_id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {s.student_name}
                              {s.is_leader && (
                                <span className="ml-1.5 inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Leader
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500">{s.student_email}</td>
                            <td className="py-3 px-4">
                              {s.group_name ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                  {s.group_name}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Ungrouped</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {s.status === 'CONFIRMED' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                  {s.acknowledged_by_leader ? 'Confirmed by Leader' : 'Confirmed On-Time'}
                                </span>
                              )}
                              {s.status === 'CONFIRMED_LATE' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                  {s.acknowledged_by_leader ? 'Confirmed by Leader (Late)' : 'Confirmed Late'}
                                </span>
                              )}
                              {s.status === 'OVERDUE' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-300">
                                  <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
                                  Pending (Overdue)
                                </span>
                              )}
                              {s.status === 'PENDING' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                  <Clock className="w-3 h-3 mr-1 text-slate-500" />
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-500">
                              {s.confirmed_at
                                ? `${new Date(s.confirmed_at).toLocaleDateString()} ${new Date(s.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
