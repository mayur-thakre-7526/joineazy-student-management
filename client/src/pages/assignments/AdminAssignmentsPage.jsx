import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { assignmentApi } from '../../services/api';
import {
  FileText,
  PlusCircle,
  Calendar,
  Users,
  User,
  ExternalLink,
  Edit,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export default function AdminAssignmentsPage() {
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
      setError(err.message || 'Failed to load assignments.');
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
        <p className="text-sm">Loading course assignments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Professor Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Course Assignments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Publish academic assignments, target student groups, and distribute external OneDrive submission portals.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-center">
          <button
            onClick={fetchAssignments}
            className="p-2 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/assignments/create"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create Assignment
          </Link>
        </div>
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
          <h3 className="text-base font-bold text-slate-900">No Assignments Published Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            You have not created any assignments yet. Create an assignment to distribute tasks to all students or specific groups.
          </p>
          <Link
            to="/assignments/create"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create First Assignment
          </Link>
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
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {assignment.scope === 'ALL' ? (
                        'All Students'
                      ) : (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          {assignment.assigned_group_count}{' '}
                          {assignment.assigned_group_count === 1 ? 'Target Group' : 'Target Groups'}
                        </>
                      )}
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
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 hover:text-brand-600 transition-colors">
                    <Link to={`/assignments/${assignment.id}`}>{assignment.title}</Link>
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {assignment.description}
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                  <Link
                    to={`/assignments/${assignment.id}/edit`}
                    className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    Edit
                  </Link>

                  <Link
                    to={`/assignments/${assignment.id}`}
                    className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
