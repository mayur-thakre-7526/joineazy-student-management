import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../services/api';
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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState(null);
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
        const res = await analyticsApi.getAdminAnalytics();
        setAnalytics(res);
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
        <p className="text-sm">Aggregating course analytics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Analytics Unavailable</h3>
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

  const { overview, assignments } = analytics;

  // Filter students in drilldown
  const filteredStudents = (trackingData?.student_tracking || []).filter((s) => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.student_email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.group_name && s.group_name.toLowerCase().includes(studentSearch.toLowerCase()));

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
              Professor Analytics & Oversight
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Coursework Performance Dashboard
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Inspect student and group confirmation progress, review real-time submission rates, and track deadline compliance.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <Link
              to="/assignments/create"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
            >
              + Create Assignment
            </Link>
          </div>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Assignments</span>
            <FileText className="w-4 h-4 text-brand-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{overview.total_assignments}</p>
          <p className="text-[11px] text-slate-500 mt-1">Course modules</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Students</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{overview.total_students}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active learners</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Groups</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{overview.total_groups}</p>
          <p className="text-[11px] text-slate-500 mt-1">Collaborative teams</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Confirmed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{overview.total_confirmed_pairs}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {overview.total_pending_pairs} pending submissions
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Completion Rate</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
            {overview.overall_completion_percentage}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${overview.overall_completion_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Assignment Performance Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Assignment Completion Breakdown</h3>
            <p className="text-xs text-slate-500">Summary metrics across all published course assignments</p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No assignments have been created yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Assignment</th>
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
                        isSelected ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">{a.title}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            a.scope === 'ALL'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {a.scope === 'ALL' ? 'Open to All' : 'Targeted Groups'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold">{a.eligible_students}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-emerald-600">
                        {a.confirmed_count}
                        {a.late_count > 0 && (
                          <span className="text-[10px] text-amber-600 block">({a.late_count} late)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-amber-600">{a.pending_count}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-bold">{a.completion_percentage}%</span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-brand-600 h-1.5 rounded-full"
                              style={{ width: `${a.completion_percentage}%` }}
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
              <h3 className="text-lg font-bold text-slate-900">
                {trackingData?.assignment?.title || 'Loading assignment...'}
              </h3>
            </div>

            {trackingData?.overall && (
              <div className="flex items-center space-x-4 text-xs text-slate-600">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  Group-Wise Progress Tracking
                </h4>

                {(trackingData.group_tracking || []).length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    No active student groups are targeted for this assignment.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">Group Name</th>
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
                            <td className="py-3 px-4 font-bold text-slate-900">{g.group_name}</td>
                            <td className="py-3 px-4 text-center">{g.eligible_count}</td>
                            <td className="py-3 px-4 text-center font-semibold text-emerald-600">{g.confirmed_count}</td>
                            <td className="py-3 px-4 text-center font-semibold text-amber-600">{g.pending_count}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <span className="font-bold">{g.progress_percentage}%</span>
                                <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      g.progress_percentage === 100 ? 'bg-emerald-500' : 'bg-purple-600'
                                    }`}
                                    style={{ width: `${g.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  g.status === 'COMPLETED'
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                    <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Student-Wise Confirmation Roster ({filteredStudents.length} of {(trackingData.student_tracking || []).length})
                  </h4>

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
                    <table className="w-full text-left text-xs text-slate-600">
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
                            <td className="py-3 px-4 font-bold text-slate-900">{s.student_name}</td>
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
                                  Confirmed On-Time
                                </span>
                              )}
                              {s.status === 'CONFIRMED_LATE' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                  Confirmed Late
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
