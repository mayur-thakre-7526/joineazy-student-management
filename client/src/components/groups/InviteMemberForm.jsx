import React, { useState } from 'react';
import { groupApi } from '../../services/api';
import { UserPlus, Mail, Hash, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function InviteMemberForm({ groupId, onInviteSuccess }) {
  const [inviteType, setInviteType] = useState('email'); // 'email' | 'id'
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const trimmed = inputValue.trim();
    if (!trimmed) {
      setErrorMsg(`Please enter a valid ${inviteType === 'email' ? 'email address' : 'student UUID'}.`);
      return;
    }

    const payload = inviteType === 'email' ? { email: trimmed } : { student_id: trimmed };

    try {
      setSubmitting(true);
      const res = await groupApi.inviteMember(groupId, payload);
      setSuccessMsg(`Invitation sent successfully to ${res.invitation.invited_student.email}!`);
      setInputValue('');
      if (onInviteSuccess) {
        onInviteSuccess();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center space-x-2 mb-3">
        <UserPlus className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-bold text-slate-900">Invite Student to Group</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        As the group creator, you can invite registered students by their institutional email or student ID.
      </p>

      {/* Mode Selector */}
      <div className="flex items-center space-x-4 mb-4 text-xs font-medium text-slate-700">
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <input
            type="radio"
            name="inviteType"
            value="email"
            checked={inviteType === 'email'}
            onChange={() => {
              setInviteType('email');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-brand-600 focus:ring-brand-500"
          />
          <span>By Email Address</span>
        </label>
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <input
            type="radio"
            name="inviteType"
            value="id"
            checked={inviteType === 'id'}
            onChange={() => {
              setInviteType('id');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-brand-600 focus:ring-brand-500"
          />
          <span>By Student UUID</span>
        </label>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            {inviteType === 'email' ? <Mail className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
          </div>
          <input
            type={inviteType === 'email' ? 'email' : 'text'}
            required
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              inviteType === 'email'
                ? 'peer.student@university.edu'
                : 'e.g. 550e8400-e29b-41d4-a716-446655440000'
            }
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm whitespace-nowrap"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Inviting...
            </>
          ) : (
            'Send Invitation'
          )}
        </button>
      </form>
    </div>
  );
}
