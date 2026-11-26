import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { assignmentApi } from '../../services/api';
import {
  FileText,
  Calendar,
  Users,
  User,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assignmentApi.getAssignments();
      setAssignments(data.assignments || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve your assignments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Loading your coursework assignments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Student Coursework
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Assigned Coursework
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access professor instructions and external OneDrive submission links for your assignments.
          </p>
        </div>

        <button
          onClick={fetchAssignments}
          className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Assignments Currently Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            There are currently no assignments assigned to your account or group. Make sure you are in a team if group-targeted tasks are expected.
          </p>
          <div className="mt-6">
            <Link
              to="/group"
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-colors"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Manage Your Group
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {assignments.map((assignment) => {
            const dueDate = new Date(assignment.due_date);
            const isPastDue = dueDate < new Date();

            return (
              <div
                key={assignment.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-grow max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {assignment.course_code && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                        {assignment.course_code}
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                        assignment.submission_type === 'GROUP'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {assignment.submission_type === 'GROUP' ? (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          Group
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          Individual
                        </>
                      )}
                    </span>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${
                        assignment.scope === 'ALL'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {assignment.scope === 'ALL' ? 'Course-wide' : 'Assigned to Your Group'}
                    </span>

                    <span
                      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${
                        isPastDue
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Due {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {assignment.is_confirmed ? (
                      <span
                        className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          assignment.is_late
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {assignment.is_late ? 'Submitted Late' : 'Submitted'}
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          isPastDue
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {isPastDue
                          ? 'Overdue'
                          : assignment.submission_type === 'GROUP'
                          ? (assignment.is_group_leader ? 'Leader Action Needed' : 'Awaiting Leader Submission')
                          : 'Pending Submission'}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 hover:text-brand-600 transition-colors">
                    <Link to={`/assignments/${assignment.id}`}>{assignment.title}</Link>
                  </h3>

                  <div className="text-xs text-slate-500 flex items-center">
                    <GraduationCap className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <span>Professor {assignment.professor_name}</span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">
                    {assignment.description}
                  </p>
                </div>

                <div className="self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto text-right">
                  <Link
                    to={`/assignments/${assignment.id}`}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    View & Submit
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
