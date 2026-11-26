import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { courseApi } from '../../services/api';
import CourseEnrollmentForm from '../../components/courses/CourseEnrollmentForm';
import {
  BookOpen,
  GraduationCap,
  FileText,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function StudentCoursesPage() {
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
      setError(err.message || 'Failed to load your enrolled courses.');
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
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-200">
            Student Academic Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Enrolled Academic Courses
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse course modules, review coursework deliverables, and self-enroll in new courses.
          </p>
        </div>

        <button
          onClick={fetchCourses}
          className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Self-Enrollment Section */}
      <CourseEnrollmentForm onEnrollSuccess={fetchCourses} />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[30vh] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
          <p className="text-sm">Loading your enrolled courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Courses Enrolled Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            You are not currently enrolled in any academic courses. Enter an enrollment code above to join your professor's class.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Your Enrolled Courses ({courses.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                      {course.course_code}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(course.enrolled_at || course.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {course.title}
                  </h4>

                  {course.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  <div className="text-xs text-slate-500 flex items-center pt-2 border-t border-slate-100">
                    <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    <span className="truncate">Prof. {course.professor_name}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 flex items-center">
                    <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {course.assignment_count}{' '}
                    {course.assignment_count === 1 ? 'Assignment' : 'Assignments'}
                  </span>
                  <span className="font-bold text-brand-600 group-hover:translate-x-1 transition-transform flex items-center">
                    View Course
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
