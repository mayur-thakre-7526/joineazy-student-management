import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentApi, submissionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Calendar,
  ExternalLink,
  Edit,
  Loader2,
  Users,
  GraduationCap,
  Clock,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  X,
  AlertTriangle,
  User,
  BookOpen,
} from 'lucide-react';

export default function AssignmentDetailsPage() {
  const { id } = useParams();
  const { user, isAdmin, isStudent } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Two-Step Confirmation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [modalError, setModalError] = useState(null);

  const confirmButtonRef = useRef(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        setError(null);
        const data = await assignmentApi.getAssignmentById(id);
        setAssignment(data.assignment);
        if (data.assignment?.submission) {
          setSubmission(data.assignment.submission);
        } else if (isStudent) {
          // Fetch submission status directly if not embedded
          try {
            const subData = await submissionApi.getStatus(id);
            setSubmission(subData.submission);
          } catch {
            setSubmission({ confirmed: false, confirmed_at: null, is_late: false });
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load assignment details.');
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id, isStudent]);

  // Handle Escape key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isModalOpen && !confirming) {
        setIsModalOpen(false);
      }
    }
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
      confirmButtonRef.current?.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, confirming]);

  const handleOpenModal = () => {
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!confirming) {
      setIsModalOpen(false);
      setModalError(null);
    }
  };

  const handleConfirmSubmission = async () => {
    try {
      setConfirming(true);
      setModalError(null);
      const res = await submissionApi.confirm(id);
      if (res.confirmation) {
        setSubmission({
          assignment_id: id,
          confirmed: true,
          confirmed_at: res.confirmation.confirmed_at,
          is_late: res.confirmation.is_late,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.message || 'Failed to record submission confirmation.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Loading assignment details...</p>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-red-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 mx-auto bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Assignment Unavailable</h2>
        <p className="text-sm text-slate-600 mt-2">
          {error || 'This assignment does not exist or you do not have permission to view it.'}
        </p>
        <div className="mt-6">
          <Link
            to="/assignments"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Back to Assignments
          </Link>
        </div>
      </div>
    );
  }

  const dueDate = new Date(assignment.due_date);
  const isPastDue = dueDate < new Date();
  const isConfirmed = submission?.confirmed === true;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <Link to="/assignments" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          ← Back to All Assignments
        </Link>
        {isAdmin && (
          <div className="flex items-center space-x-3">
            <Link
              to={`/assignments/${id}/edit`}
              className="inline-flex items-center px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Edit Assignment
            </Link>
          </div>
        )}
      </div>

      {/* Main Details Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {assignment.course_code && (
              <Link
                to={`/courses/${assignment.course_id}`}
                className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center transition-colors"
                title="View Course"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1" />
                {assignment.course_code}
              </Link>
            )}

            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${
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

            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${
                assignment.scope === 'ALL'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {assignment.scope === 'ALL' ? 'Open to All Students' : 'Specific Target Groups'}
            </span>

            <span
              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded ${
                isPastDue
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <Clock className="w-3 h-3 mr-1" />
              {isPastDue ? 'Past Deadline' : 'Active Coursework'}
            </span>

            {isStudent && isConfirmed && (
              <span
                className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  submission.is_late
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {submission.is_late ? 'Submitted Late' : 'Submitted On-Time'}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {assignment.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
            <span className="flex items-center">
              <GraduationCap className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Instructor: <strong>{assignment.professor_name}</strong> ({assignment.professor_email})
            </span>
            <span className="flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              Deadline: <strong>{dueDate.toLocaleDateString()} at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
          </div>
        </div>

        {/* Detailed Instructions */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Assignment Guidelines & Description
          </h3>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-5 rounded-xl border border-slate-100">
            {assignment.description}
          </div>
        </div>

        {/* Admin Target Groups View */}
        {isAdmin && assignment.assigned_groups && (
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center">
              <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
              Assigned Student Groups ({assignment.assigned_groups.length})
            </h3>
            {assignment.assigned_groups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignment.assigned_groups.map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Assignment scope is configured for all students.</p>
            )}
          </div>
        )}

        {/* Student Submission Confirmation Panel */}
        {isStudent && (
          <div className="pt-6 border-t border-slate-100">
            {isConfirmed ? (
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-emerald-900">Submission Confirmed</h4>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          submission.is_late
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {submission.is_late ? 'Late Submission' : 'On-Time'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-1">
                      Recorded on {new Date(submission.confirmed_at).toLocaleDateString()} at{' '}
                      {new Date(submission.confirmed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                    </p>
                    <p className="text-xs text-slate-500 mt-1 italic">
                      Confirmation recorded in Joineazy. File upload occurs externally on OneDrive.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-900">Submission Pending</h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    Once you have uploaded your files to the professor's OneDrive, confirm your submission declaration below.
                  </p>
                </div>

                <button
                  onClick={handleOpenModal}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 whitespace-nowrap self-start sm:self-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Yes, I have submitted
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submission Action Box (OneDrive Link) */}
        <div className="pt-6 border-t border-slate-100 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center">
              <ExternalLink className="w-4 h-4 mr-2 text-brand-600" />
              External Submission Portal (OneDrive)
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Files are submitted directly to the professor's cloud storage. Open the link in a new tab to submit.
            </p>
          </div>

          <a
            href={assignment.onedrive_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 whitespace-nowrap self-start sm:self-center"
          >
            Open OneDrive Submission Link
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>

      {/* Two-Step Confirmation Accessible Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-heading"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2.5 text-brand-700">
                <CheckCircle2 className="w-5 h-5" />
                <h3 id="modal-heading" className="text-base font-bold text-slate-900">
                  Confirm Assignment Submission
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={confirming}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Please confirm that you have uploaded your assignment using the provided OneDrive link. This action records your submission declaration.
            </p>

            {isPastDue && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Notice: The deadline for this assignment has passed. Your confirmation will be recorded with a <strong>Late</strong> status.
                </span>
              </div>
            )}

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={confirming}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={handleConfirmSubmission}
                disabled={confirming}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Confirm Submission'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
