import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { courseApi } from '../../services/api';
import {
  BookPlus,
  Loader2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function CreateCoursePage() {
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2) {
      setErrorMsg('Course title must be at least 2 characters.');
      return;
    }

    const trimmedCode = courseCode.trim().toUpperCase();
    if (trimmedCode.length < 2) {
      setErrorMsg('Course code must be at least 2 characters (e.g. CS101, SE-2026).');
      return;
    }

    try {
      setSubmitting(true);
      await courseApi.createCourse({
        title: trimmedTitle,
        course_code: trimmedCode,
        description: description.trim(),
      });
      navigate('/courses', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create course. Please verify the details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <Link to="/courses" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          ← Back to Courses
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2 flex items-center">
          <BookPlus className="w-7 h-7 mr-2.5 text-brand-600" />
          Create Academic Course
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Establish an academic course module, define a unique enrollment code, and organize your students.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
            Course Title *
          </label>
          <input
            type="text"
            required
            disabled={submitting}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Advanced Database Systems & Architecture"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
            Course Enrollment Code *
          </label>
          <input
            type="text"
            required
            disabled={submitting}
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
            placeholder="e.g. CS101 or CS-402"
            className="w-full px-3.5 py-2.5 text-sm uppercase font-mono tracking-wider bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Unique alphanumeric identifier that students will enter to self-enroll into this course.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
            Course Description & Syllabus Overview
          </label>
          <textarea
            rows={4}
            disabled={submitting}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline course learning objectives, weekly expectations, lab prerequisites, and grading policies..."
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 leading-relaxed"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <Link
            to="/courses"
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Course...
              </>
            ) : (
              <>
                Publish Course
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
