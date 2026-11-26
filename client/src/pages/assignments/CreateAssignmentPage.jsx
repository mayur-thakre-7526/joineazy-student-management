import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { assignmentApi, courseApi } from '../../services/api';
import {
  FilePlus,
  Loader2,
  Calendar,
  Link as LinkIcon,
  Users,
  User,
  Search,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';

export default function CreateAssignmentPage() {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [onedriveLink, setOnedriveLink] = useState('');
  const [scope, setScope] = useState('ALL'); // 'ALL' | 'SPECIFIC_GROUPS'
  const [courseId, setCourseId] = useState(initialCourseId);
  const [submissionType, setSubmissionType] = useState('INDIVIDUAL'); // 'INDIVIDUAL' | 'GROUP'
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);

  // Courses data
  const [availableCourses, setAvailableCourses] = useState([]);

  // Groups data for specific targeting
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const navigate = useNavigate();

  // Load professor courses
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await courseApi.getMyCourses();
        setAvailableCourses(res.courses || []);
      } catch (err) {
        console.warn('Failed to load courses for assignment form:', err.message);
      }
    }
    loadCourses();
  }, []);

  // Load groups when scope is SPECIFIC_GROUPS
  useEffect(() => {
    if (scope === 'SPECIFIC_GROUPS' && availableGroups.length === 0) {
      async function loadGroups() {
        try {
          setLoadingGroups(true);
          const data = await assignmentApi.getAdminGroups();
          setAvailableGroups(data.groups || []);
        } catch (err) {
          setErrorMsg('Failed to load student groups for targeting.');
        } finally {
          setLoadingGroups(false);
        }
      }
      loadGroups();
    }
  }, [scope, availableGroups.length]);

  const toggleGroupSelection = (groupId) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredGroups.map((g) => g.id);
    setSelectedGroupIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleDeselectAll = () => {
    setSelectedGroupIds([]);
  };

  const filteredGroups = availableGroups.filter((g) =>
    g.name.toLowerCase().includes(groupFilter.trim().toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (scope === 'SPECIFIC_GROUPS' && selectedGroupIds.length === 0) {
      setErrorMsg('Please select at least one target student group.');
      return;
    }

    try {
      setSubmitting(true);
      await assignmentApi.createAssignment({
        title: title.trim(),
        description: description.trim(),
        due_date: new Date(dueDate).toISOString(),
        onedrive_link: onedriveLink.trim(),
        scope,
        course_id: courseId || null,
        submission_type: submissionType,
        group_ids: scope === 'SPECIFIC_GROUPS' ? selectedGroupIds : [],
      });

      navigate('/assignments', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <Link to="/assignments" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          ← Back to Course Assignments
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2 flex items-center">
          <FilePlus className="w-7 h-7 mr-2.5 text-brand-600" />
          Create New Assignment
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Distribute an assignment to all enrolled students or target specific student teams.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
            Assignment Title *
          </label>
          <input
            type="text"
            required
            minLength={2}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Milestone 1 - Database Architecture & Schema Design"
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Associated Course Selector (Round 2) */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Associated Academic Course (Optional)
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">General Coursework (No course restriction / Legacy)</option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} — {c.title}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            If selected, only students enrolled in this course module will have visibility into this assignment.
          </p>
        </div>

        {/* Submission Type Selector (Round 2) */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
            Submission Type *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${
                submissionType === 'INDIVIDUAL'
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="submissionType"
                value="INDIVIDUAL"
                checked={submissionType === 'INDIVIDUAL'}
                onChange={() => setSubmissionType('INDIVIDUAL')}
                className="mt-0.5 text-brand-600 focus:ring-brand-500"
              />
              <div className="ml-3">
                <span className="block text-sm font-semibold text-slate-900 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Individual Submission
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Each enrolled student submits their work and confirms individually.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${
                submissionType === 'GROUP'
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="submissionType"
                value="GROUP"
                checked={submissionType === 'GROUP'}
                onChange={() => setSubmissionType('GROUP')}
                className="mt-0.5 text-brand-600 focus:ring-brand-500"
              />
              <div className="ml-3">
                <span className="block text-sm font-semibold text-slate-900 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                  Group Submission
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Student project teams submit collaborative deliverables acknowledged by the group leader.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
            Assignment Description & Objectives *
          </label>
          <textarea
            required
            rows={5}
            minLength={2}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide comprehensive assignment guidelines, deliverables, rubric expectations, and submission requirements..."
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          />
        </div>

        {/* Due Date & OneDrive Link Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              Submission Deadline (Due Date) *
            </label>
            <input
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Parsed and stored consistently in UTC with user timezone preservation.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5 flex items-center">
              <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              External OneDrive / SharePoint Submission Link *
            </label>
            <input
              type="url"
              required
              value={onedriveLink}
              onChange={(e) => setOnedriveLink(e.target.value)}
              placeholder="https://1drv.ms/... or https://university.sharepoint.com/..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Secure HTTPS link where students submit their files externally.
            </p>
          </div>
        </div>

        {/* Scope Selector */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
            Target Audience Scope *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${
                scope === 'ALL'
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="ALL"
                checked={scope === 'ALL'}
                onChange={() => setScope('ALL')}
                className="mt-0.5 text-brand-600 focus:ring-brand-500"
              />
              <div className="ml-3">
                <span className="block text-sm font-semibold text-slate-900">
                  {courseId ? 'All Enrolled Students in Course' : 'All Students (Open Coursework)'}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {courseId
                    ? 'Visible to all students enrolled in this course module.'
                    : 'Visible to every student, whether in an active group or ungrouped.'}
                </span>
              </div>
            </label>

            <label
              className={`flex items-start p-3.5 border rounded-xl cursor-pointer transition-all ${
                scope === 'SPECIFIC_GROUPS'
                  ? 'border-brand-600 bg-brand-50/50 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="scope"
                value="SPECIFIC_GROUPS"
                checked={scope === 'SPECIFIC_GROUPS'}
                onChange={() => setScope('SPECIFIC_GROUPS')}
                className="mt-0.5 text-brand-600 focus:ring-brand-500"
              />
              <div className="ml-3">
                <span className="block text-sm font-semibold text-slate-900">
                  Specific Groups (Targeted Scope)
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Restricted strictly to members of the selected student teams.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Specific Groups Target Selector */}
        {scope === 'SPECIFIC_GROUPS' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-800 flex items-center">
                  <Users className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                  Select Target Student Groups ({selectedGroupIds.length} selected)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Choose which active student groups are assigned this coursework.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-brand-600 hover:text-brand-700 font-semibold"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                placeholder="Filter groups by name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {loadingGroups ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin inline mr-1.5" />
                Loading enrolled student groups...
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
                No groups matched your filter.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg text-xs">
                {filteredGroups.map((group) => {
                  const isSelected = selectedGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-brand-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleGroupSelection(group.id)}
                          className="rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-semibold text-slate-800">{group.name}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <Link
            to="/assignments"
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
                Publishing Assignment...
              </>
            ) : (
              <>
                Publish Assignment
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
