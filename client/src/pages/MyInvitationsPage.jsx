import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { groupApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Users,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function MyInvitationsPage() {
  const { refreshPendingCount } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const navigate = useNavigate();

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await groupApi.getMyPendingInvitations();
      setInvitations(data.invitations || []);
      refreshPendingCount();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleRespond = async (invitationId, action) => {
    setActionLoadingId(invitationId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await groupApi.respondToInvitation(invitationId, action);
      if (action === 'ACCEPT') {
        setSuccessMsg(res.message);
        refreshPendingCount();
        setTimeout(() => {
          navigate('/group', { replace: true });
        }, 1000);
      } else {
        setSuccessMsg(res.message);
        // Remove from current list
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        refreshPendingCount();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process invitation response.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Checking pending invitations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Inbox className="w-6 h-6 mr-2 text-brand-600" />
            Pending Group Invitations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review invitations from group leaders wishing to add you to their project team.
          </p>
        </div>
        <Link
          to="/group"
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center self-start sm:self-center"
        >
          View My Group
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {invitations.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Pending Invitations</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            You do not currently have any pending group invitations. When a group leader invites you, it will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((inv) => (
            <div
              key={inv.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    Group Invitation
                  </span>
                  <span className="text-xs text-slate-400 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(inv.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {inv.group_name}
                </h3>
                <p className="text-xs text-slate-600">
                  Invited by: <strong>{inv.inviter_name}</strong> ({inv.inviter_email})
                </p>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                <button
                  onClick={() => handleRespond(inv.id, 'REJECT')}
                  disabled={actionLoadingId === inv.id}
                  className="inline-flex items-center px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:text-red-600 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Decline
                </button>
                <button
                  onClick={() => handleRespond(inv.id, 'ACCEPT')}
                  disabled={actionLoadingId === inv.id}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {actionLoadingId === inv.id ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Accept & Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
