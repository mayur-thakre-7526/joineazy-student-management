import React, { useState } from 'react';
import { courseApi } from '../../services/api';
import { BookOpen, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function CourseEnrollmentForm({ onEnrollSuccess }) {
  const [courseCode, setCourseCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedCode = courseCode.trim().toUpperCase();
    if (!trimmedCode) {
      setErrorMsg('Please enter a course enrollment code.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await courseApi.enrollByCode(trimmedCode);
      setSuccessMsg(res.message || `Successfully enrolled in ${res.course.title}!`);
      setCourseCode('');
      if (onEnrollSuccess) {
        onEnrollSuccess(res.course);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to enroll in course. Please check the code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Enroll in a Course</h3>
          <p className="text-xs text-slate-500">
            Enter the unique course code provided by your course professor (e.g. CS101, SE-2026).
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleEnroll} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-grow">
          <input
            type="text"
            required
            disabled={submitting}
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
            placeholder="e.g. CS101 or SE-2026"
            className="w-full px-4 py-2.5 text-sm uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono tracking-wider disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm shrink-0"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enrolling...
            </>
          ) : (
            <>
              Enroll Course
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
