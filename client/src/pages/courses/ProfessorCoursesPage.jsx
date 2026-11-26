import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { courseApi } from '../../services/api';
import {
  BookOpen,
  PlusCircle,
  Users,
  FileText,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function ProfessorCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await courseApi.getMyCourses();
      setCourses(data.courses || []);
    } catch (err) {
      setError(err.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Professor Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Course Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic course modules, monitor student enrollment rosters, and distribute scoped assignments.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-center">
          <button
            onClick={fetchCourses}
            className="p-2 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/courses/create"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create Course
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[30vh] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
          <p className="text-sm">Loading your taught courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Courses Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            You have not established any academic course modules. Create your first course to begin enrolling students and organizing coursework.
          </p>
          <Link
            to="/courses/create"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Create First Course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
                    {course.course_code}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(course.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{course.title}</h3>

                {course.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block font-semibold">Enrolled Students</span>
                    <span className="text-lg font-bold text-slate-900 flex items-center justify-center mt-0.5">
                      <Users className="w-4 h-4 mr-1.5 text-blue-500" />
                      {course.student_count}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center">
                    <span className="text-xs text-slate-400 block font-semibold">Assignments</span>
                    <span className="text-lg font-bold text-slate-900 flex items-center justify-center mt-0.5">
                      <FileText className="w-4 h-4 mr-1.5 text-purple-500" />
                      {course.assignment_count}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={`/assignments/create?courseId=${course.id}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1 text-brand-600" />
                  Add Assignment
                </Link>

                <Link
                  to={`/courses/${course.id}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Inspect
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
