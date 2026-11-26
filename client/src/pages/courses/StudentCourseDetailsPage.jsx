import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { courseApi } from '../../services/api';
import {
  BookOpen,
  GraduationCap,
  FileText,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  Users,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function StudentCourseDetailsPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCourseData() {
      try {
        setLoading(true);
        setError(null);
        const [courseRes, assignmentsRes] = await Promise.all([
          courseApi.getCourseById(id),
          courseApi.getCourseAssignments(id),
        ]);
        setCourse(courseRes.course);
        setAssignments(assignmentsRes.assignments || []);
      } catch (err) {
        setError(err.message || 'Failed to load course details.');
      } finally {
        setLoading(false);
      }
    }
    loadCourseData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Loading course and coursework details...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Course Unavailable</h3>
        <p className="text-xs text-slate-600 mt-2">
          {error || 'This course does not exist or you do not have permission to view it.'}
        </p>
        <Link
          to="/courses"
          className="mt-6 inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition-colors"
        >
          ← Back to Enrolled Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Navigation */}
      <div>
        <Link to="/courses" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          ← Back to Enrolled Courses
        </Link>
      </div>

      {/* Course Overview Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 inline-block self-start">
            {course.course_code}
          </span>
          <span className="text-xs text-slate-500 flex items-center">
            <GraduationCap className="w-4 h-4 mr-1 text-slate-400" />
            Instructor: <strong>{course.professor_name}</strong> ({course.professor_email})
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {course.title}
        </h1>

        {course.description && (
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
            {course.description}
          </p>
        )}
      </div>

      {/* Course Assignments Roster */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Coursework & Deliverables</h3>
            <p className="text-xs text-slate-500">
              Assignments published under {course.course_code} ({assignments.length})
            </p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-bold text-slate-900">No Coursework Assigned Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              The instructor has not published any assignments for this course module yet. Check back soon.
            </p>
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
                      {/* Submission Type Badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                          assignment.submission_type === 'GROUP'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {assignment.submission_type === 'GROUP' ? (
                          <>
                            <Users className="w-3 h-3 mr-1" />
                            Group Submission
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            Individual Submission
                          </>
                        )}
                      </span>

                      {/* Scope Badge */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {assignment.scope === 'ALL' ? 'Course-wide' : 'Targeted Group'}
                      </span>

                      {/* Deadline Badge */}
                      <span
                        className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded ${
                          isPastDue
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Due {dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Acknowledgment / Confirmation Status */}
                      {assignment.is_confirmed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 mr-1 text-amber-600" />
                          Pending Confirmation
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-slate-900 hover:text-brand-600 transition-colors">
                      <Link to={`/assignments/${assignment.id}`}>{assignment.title}</Link>
                    </h4>

                    {assignment.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2.5 self-end md:self-center shrink-0">
                    <a
                      href={assignment.onedrive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                      OneDrive Portal
                    </a>
                    <Link
                      to={`/assignments/${assignment.id}`}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
                    >
                      View & Confirm
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
