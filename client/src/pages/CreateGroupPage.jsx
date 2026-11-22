import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { groupApi } from '../services/api';
import { Users, Loader2, ArrowRight, AlertCircle, ShieldAlert } from 'lucide-react';

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState('');
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alreadyInGroup, setAlreadyInGroup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const navigate = useNavigate();

  // Guard: Pre-check if student already has a group
  useEffect(() => {
    async function checkMembership() {
      try {
        const data = await groupApi.getMyGroup();
        if (data.group) {
          setAlreadyInGroup(data.group);
        }
      } catch {
        // proceed
      } finally {
        setCheckingExisting(false);
      }
    }
    checkMembership();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = groupName.trim();
    if (trimmed.length < 2) {
      setErrorMsg('Group name must be at least 2 characters long.');
      return;
    }
    if (trimmed.length > 100) {
      setErrorMsg('Group name cannot exceed 100 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await groupApi.createGroup({ name: trimmed });
      navigate('/group', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Checking membership eligibility...</p>
      </div>
    );
  }

  // If student already has a group, block creation form
  if (alreadyInGroup) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white border border-amber-200 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 mx-auto bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Already in a Group</h2>
        <p className="text-sm text-slate-600 mt-2">
          You are already a member of <strong>{alreadyInGroup.name}</strong>. Students may only belong to one active group at a time.
        </p>
        <div className="mt-6">
          <Link
            to="/group"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
          >
            View Your Group
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-12 px-4 sm:px-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xl mb-4">
          <Users className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Create New Group
        </h1>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Form an academic collaboration team. As creator, you will automatically be assigned as leader and can invite peers.
        </p>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Group / Team Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Distributed Systems Team A"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Choose a clear name identifiable by your classmates and professor.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Establishing Group...
              </>
            ) : (
              <>
                Confirm & Create Group
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
