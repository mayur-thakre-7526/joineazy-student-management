import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { groupApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GroupMembersList from '../components/groups/GroupMembersList';
import InviteMemberForm from '../components/groups/InviteMemberForm';
import {
  Users,
  PlusCircle,
  Inbox,
  RefreshCw,
  Loader2,
  Calendar,
  Crown,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function MyGroupPage() {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await groupApi.getMyGroup();
      setGroup(data.group);
    } catch (err) {
      setError(err.message || 'Failed to retrieve group details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Loading your group information...</p>
      </div>
    );
  }

  // State A: Student is not in any group
  if (!group) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-5">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            You Are Not in a Group Yet
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            In Joineazy, academic projects are submitted collectively by student groups. You can create a new group or check invitations sent to you by classmates.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/groups/create"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Create a New Group
            </Link>
            <Link
              to="/invitations"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Inbox className="w-4 h-4 mr-2 text-slate-500" />
              Check Pending Invitations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State B: Student is in an active group
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Group Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-bold tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                Active Student Group
              </span>
              {group.is_creator && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center">
                  <Crown className="w-3 h-3 mr-1 text-amber-600" />
                  You are the Group Leader
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {group.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center">
                <Crown className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Created by <strong>{group.created_by.full_name}</strong>
              </span>
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Established on {new Date(group.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <button
            onClick={fetchGroup}
            className="inline-flex items-center justify-center px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Roster
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Grid: Members List & Invitation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Members List */}
        <div className="lg:col-span-2 space-y-6">
          <GroupMembersList members={group.members} />
        </div>

        {/* Right Column: Invitations (for Creator) or Group Policy Notice */}
        <div className="space-y-6">
          {group.is_creator ? (
            <>
              <InviteMemberForm groupId={group.id} onInviteSuccess={fetchGroup} />

              {/* Sent Pending Invitations List */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
                  Sent Pending Invitations ({group.pending_invitations?.length || 0})
                </h4>

                {group.pending_invitations && group.pending_invitations.length > 0 ? (
                  <div className="divide-y divide-slate-100 text-xs">
                    {group.pending_invitations.map((inv) => (
                      <div key={inv.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="font-semibold text-slate-900">{inv.student_name}</div>
                        <div className="text-slate-500 truncate">{inv.student_email}</div>
                        <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block mt-1">
                          Awaiting Response • Sent {new Date(inv.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    No pending invitations awaiting response.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-brand-700 font-semibold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Group Membership Rule</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are registered as a group member. To preserve academic integrity, only the group creator ({group.created_by.full_name}) can invite additional peers.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
