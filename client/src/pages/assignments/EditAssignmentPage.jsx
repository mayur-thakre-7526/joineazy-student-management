import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { assignmentApi } from '../../services/api';
import {
  Edit,
  Loader2,
  Calendar,
  Link as LinkIcon,
  Users,
  Search,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function EditAssignmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [onedriveLink, setOnedriveLink] = useState('');
  const [scope, setScope] = useState('ALL');
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);

  // Groups data
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupFilter, setGroupFilter] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        setErrorMsg(null);

        // Fetch assignment details and admin groups concurrently
        const [assignmentRes, groupsRes] = await Promise.all([
          assignmentApi.getAssignmentById(id),
          assignmentApi.getAdminGroups(),
        ]);

        const a = assignmentRes.assignment;
        setTitle(a.title);
        setDescription(a.description);
        // Format ISO date for datetime-local input
        const localDate = new Date(a.due_date);
        const isoLocal = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setDueDate(isoLocal);
        setOnedriveLink(a.onedrive_link);
        setScope(a.scope);

        if (a.assigned_groups) {
          setSelectedGroupIds(a.assigned_groups.map((g) => g.id));
        }

        setAvailableGroups(groupsRes.groups || []);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load assignment for editing.');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [id]);

  const toggleGroupSelection = (groupId) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((i) => i !== groupId) : [...prev, groupId]
    );
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
      await assignmentApi.updateAssignment(id, {
        title: title.trim(),
        description: description.trim(),
        due_date: new Date(dueDate).toISOString(),
        onedrive_link: onedriveLink.trim(),
        scope,
        group_ids: scope === 'SPECIFIC_GROUPS' ? selectedGroupIds : [],
      });

      navigate(`/assignments/${id}`, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Loading assignment details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <Link to={`/assignments/${id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
          ← Cancel and Return to Details
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2 flex items-center">
          <Edit className="w-7 h-7 mr-2.5 text-brand-600" />
          Edit Course Assignment
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Update assignment parameters, deadlines, submission portal, or target group mappings.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
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
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

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
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          />
        </div>

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
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
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
                  All Students (General Scope)
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Replaces any previous group targeting with open course access.
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
                  Restricted strictly to the selected student teams.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Groups Selection */}
        {scope === 'SPECIFIC_GROUPS' && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase text-slate-800 flex items-center">
                <Users className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                Target Student Groups ({selectedGroupIds.length} selected)
              </span>
            </div>

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
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <Link
            to={`/assignments/${id}`}
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
                Saving Changes...
              </>
            ) : (
              <>
                Save Assignment Changes
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
